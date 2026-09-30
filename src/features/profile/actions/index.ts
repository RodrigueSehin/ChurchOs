"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, AVATAR_MIME_EXTENSIONS, AVATAR_PRESETS } from "@/features/profile/avatars";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema, updateProfileSchema } from "@/features/profile/schemas";

export interface ProfileActionState {
  error?: string;
  success?: boolean;
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();

  const parsed = updateProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone") ?? "",
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const v = parsed.data;

  // RLS `profiles_update_self` : on ne peut modifier que sa propre ligne (id = auth.uid()).
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: v.firstName,
      last_name: v.lastName,
      display_name: `${v.firstName} ${v.lastName}`.trim(),
      phone: v.phone === "" ? null : v.phone,
      timezone: v.timezone,
      currency: v.currency,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePassword(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const supabase = await createClient();
  // Réauthentification : une session volée ne doit pas suffire à changer le mot de passe.
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (authError) return { error: "Mot de passe actuel incorrect" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  return { success: true };
}

export interface AvatarActionState extends ProfileActionState {
  avatarUrl?: string | null;
}

/** Chemin Storage d'une photo de NOTRE bucket (sinon `null` : avatar prédéfini ou URL externe). */
function avatarStoragePath(url: string | null | undefined) {
  const marker = `/object/public/${AVATAR_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

async function saveAvatar(userId: string, previousUrl: string | null | undefined, nextUrl: string | null): Promise<AvatarActionState> {
  const supabase = await createClient();
  // RLS `profiles_update_self` : seule sa propre ligne est modifiable.
  const { error } = await supabase.from("profiles").update({ avatar_url: nextUrl }).eq("id", userId);
  if (error) return { error: error.message };

  // L'ancienne photo envoyée est retirée une fois la nouvelle en place (pas d'orphelin).
  const previous = avatarStoragePath(previousUrl);
  if (previous) {
    const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([previous]);
    if (removeError) console.error("profile: suppression de l'ancien avatar impossible", removeError.message);
  }

  revalidatePath("/", "layout");
  return { success: true, avatarUrl: nextUrl };
}

/** Choisit un avatar de la liste prédéfinie (liste blanche stricte : aucune URL libre). */
export async function setPresetAvatar(path: string): Promise<AvatarActionState> {
  const user = await requireUser();
  if (!AVATAR_PRESETS.includes(path)) return { error: "Avatar inconnu." };
  return saveAvatar(user.id, user.profile?.avatarUrl, path);
}

export async function uploadAvatar(_prev: AvatarActionState, formData: FormData): Promise<AvatarActionState> {
  const user = await requireUser();

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Sélectionnez une image." };
  const extension = AVATAR_MIME_EXTENSIONS[file.type];
  if (!extension) return { error: "Format non accepté (PNG, JPEG ou WebP uniquement)." };
  if (file.size > AVATAR_MAX_BYTES) return { error: "Image trop volumineuse (2 Mo maximum)." };

  const supabase = await createClient();
  const path = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, { contentType: file.type });
  if (uploadError) return { error: `Échec du téléversement : ${uploadError.message}` };

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const result = await saveAvatar(user.id, user.profile?.avatarUrl, data.publicUrl);
  if (result.error) await supabase.storage.from(AVATAR_BUCKET).remove([path]);
  return result;
}

/** Retire l'avatar : l'interface retombe sur les initiales. */
export async function removeAvatar(): Promise<AvatarActionState> {
  const user = await requireUser();
  return saveAvatar(user.id, user.profile?.avatarUrl, null);
}
