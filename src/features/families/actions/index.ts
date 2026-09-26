"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { addFamilyMemberSchema, familySchema } from "@/features/families/schemas";

export interface FamilyActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseFamilyForm(formData: FormData) {
  return familySchema.safeParse({
    name: formData.get("name"),
    familyCode: formData.get("familyCode"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
    primaryContactPersonId: formData.get("primaryContactPersonId"),
    notes: formData.get("notes"),
  });
}

export async function createFamily(_prev: FamilyActionState, formData: FormData): Promise<FamilyActionState> {
  const check = await checkPermission("members.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une famille." };

  const parsed = parseFamilyForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("families").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    family_code: orNull(v.familyCode),
    address_line1: orNull(v.addressLine1),
    city: orNull(v.city),
    primary_contact_person_id: orNull(v.primaryContactPersonId),
    notes: orNull(v.notes),
  });
  if (error) return { error: error.message };

  revalidatePath("/families");
  return { success: true };
}

export async function updateFamily(
  familyId: string,
  _prev: FamilyActionState,
  formData: FormData,
): Promise<FamilyActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette famille." };

  const parsed = parseFamilyForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .update({
      name: v.name,
      family_code: orNull(v.familyCode),
      address_line1: orNull(v.addressLine1),
      city: orNull(v.city),
      primary_contact_person_id: orNull(v.primaryContactPersonId),
      notes: orNull(v.notes),
    })
    .eq("id", familyId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/families");
  revalidatePath(`/families/${familyId}`);
  return { success: true };
}

/** Réservé aux admins d'organisation : la policy RLS de suppression sur les tables métier exige
 * `is_org_admin()` (voir docs/architecture/03-multi-tenancy-and-rls.md) — inutile de proposer ce
 * bouton à un rôle qui échouerait de toute façon. */
export async function deleteFamily(familyId: string): Promise<FamilyActionState> {
  const check = await checkPermission("members.delete");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une famille." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("families")
    .delete()
    .eq("id", familyId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/families");
  return { success: true };
}

export async function addFamilyMember(
  familyId: string,
  _prev: FamilyActionState,
  formData: FormData,
): Promise<FamilyActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette famille." };

  const parsed = addFamilyMemberSchema.safeParse({
    personId: formData.get("personId"),
    relationshipToHead: formData.get("relationshipToHead"),
    isHead: formData.get("isHead") === "on",
    isPrimaryContact: formData.get("isPrimaryContact") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("family_members").insert({
    organization_id: check.organization.organization.id,
    family_id: familyId,
    person_id: v.personId,
    relationship_to_head: orNull(v.relationshipToHead),
    is_head: v.isHead,
    is_primary_contact: v.isPrimaryContact,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Cette personne fait déjà partie de la famille." };
    }
    return { error: error.message };
  }

  revalidatePath(`/families/${familyId}`);
  return { success: true };
}

/** Réservé aux admins : `family_members` n'a pas de statut "inactif", seul un vrai `DELETE`
 * retire quelqu'un — bloqué par RLS (`is_org_admin`) pour tout autre rôle. */
export async function removeFamilyMember(familyId: string, familyMemberId: string): Promise<FamilyActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut retirer un membre de la famille." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", familyMemberId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(`/families/${familyId}`);
  return { success: true };
}
