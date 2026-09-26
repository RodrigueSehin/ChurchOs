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
    logoUrl: formData.get("logoUrl"),
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
      logo_url: orDbNull(v.logoUrl),
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
