"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { campusSchema, updateOrganizationSchema } from "@/features/organizations/schemas";

export interface OrgActionState {
  error?: string;
  success?: boolean;
}

function orDbNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function updateOrganization(
  _prev: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier l'église." };

  const parsed = updateOrganizationSchema.safeParse({
    name: formData.get("name"),
    legalName: formData.get("legalName"),
    description: formData.get("description"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
    region: formData.get("region"),
    countryCode: formData.get("countryCode"),
    postalCode: formData.get("postalCode"),
    timezone: formData.get("timezone"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: v.name,
      legal_name: orDbNull(v.legalName),
      description: orDbNull(v.description),
      email: orDbNull(v.email),
      phone: orDbNull(v.phone),
      website: orDbNull(v.website),
      address_line1: orDbNull(v.addressLine1),
      city: orDbNull(v.city),
      region: orDbNull(v.region),
      country_code: v.countryCode,
      postal_code: orDbNull(v.postalCode),
      timezone: v.timezone,
      currency: v.currency,
    })
    .eq("id", check.organization.organization.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/church");
  return { success: true };
}

const LOGO_BUCKET = "churchos-logos";
const LOGO_MIME_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

/** Chemin Storage d'un logo de NOTRE bucket à partir de son URL publique (sinon `null` : URL
 * externe saisie à l'ancienne, qu'on ne touche pas). */
function logoStoragePath(url: string | null) {
  const marker = `/object/public/${LOGO_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export interface LogoActionState extends OrgActionState {
  logoUrl?: string | null;
}

export async function uploadOrganizationLogo(_prev: LogoActionState, formData: FormData): Promise<LogoActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier le logo." };

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Sélectionnez une image." };
  const extension = LOGO_MIME_EXTENSIONS[file.type];
  if (!extension) return { error: "Format non accepté (PNG, JPEG ou WebP uniquement)." };
  if (file.size > LOGO_MAX_BYTES) return { error: "Image trop volumineuse (2 Mo maximum)." };

  const organization = check.organization.organization;
  const path = `${organization.id}/logo-${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, { contentType: file.type });
  if (uploadError) return { error: `Échec du téléversement : ${uploadError.message}` };

  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const { error } = await supabase.from("organizations").update({ logo_url: data.publicUrl }).eq("id", organization.id);
  if (error) {
    await supabase.storage.from(LOGO_BUCKET).remove([path]);
    return { error: error.message };
  }

  // Ancien logo hébergé chez nous : supprimé une fois le nouveau en place (pas d'orphelin).
  const previous = logoStoragePath(organization.logoUrl);
  if (previous) await supabase.storage.from(LOGO_BUCKET).remove([previous]);

  revalidatePath("/", "layout");
  return { success: true, logoUrl: data.publicUrl };
}

export async function removeOrganizationLogo(): Promise<LogoActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier le logo." };

  const organization = check.organization.organization;
  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ logo_url: null }).eq("id", organization.id);
  if (error) return { error: error.message };

  const previous = logoStoragePath(organization.logoUrl);
  if (previous) await supabase.storage.from(LOGO_BUCKET).remove([previous]);

  revalidatePath("/", "layout");
  return { success: true, logoUrl: null };
}

export async function createCampus(_prev: OrgActionState, formData: FormData): Promise<OrgActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les campus." };

  const parsed = campusSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("campuses").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    code: orDbNull(v.code),
    email: orDbNull(v.email),
    phone: orDbNull(v.phone),
    address_line1: orDbNull(v.addressLine1),
    city: orDbNull(v.city),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un campus avec ce nom (ou ce code) existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/settings/church");
  return { success: true };
}

export async function updateCampus(
  campusId: string,
  _prev: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les campus." };

  const parsed = campusSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("campuses")
    .update({
      name: v.name,
      code: orDbNull(v.code),
      email: orDbNull(v.email),
      phone: orDbNull(v.phone),
      address_line1: orDbNull(v.addressLine1),
      city: orDbNull(v.city),
    })
    .eq("id", campusId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/church");
  return { success: true };
}

export async function setMainCampus(campusId: string): Promise<OrgActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les campus." };

  const supabase = await createClient();
  const orgId = check.organization.organization.id;

  const { error: clearError } = await supabase
    .from("campuses")
    .update({ is_main: false })
    .eq("organization_id", orgId)
    .neq("id", campusId);
  if (clearError) return { error: clearError.message };

  const { error } = await supabase
    .from("campuses")
    .update({ is_main: true })
    .eq("id", campusId)
    .eq("organization_id", orgId);
  if (error) return { error: error.message };

  revalidatePath("/settings/church");
  return { success: true };
}

export async function deleteCampus(campusId: string): Promise<OrgActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les campus." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("campuses")
    .delete()
    .eq("id", campusId)
    .eq("organization_id", check.organization.organization.id)
    .eq("is_main", false);
  if (error) return { error: error.message };

  revalidatePath("/settings/church");
  return { success: true };
}
