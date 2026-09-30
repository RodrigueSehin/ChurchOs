"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
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
    avatarUrl: formData.get("avatarUrl") ?? "",
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
      avatar_url: v.avatarUrl === "" ? null : v.avatarUrl,
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
