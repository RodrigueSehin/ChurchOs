"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { memberFormSchema } from "@/features/members/schemas";

export interface MemberActionState {
  error?: string;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseForm(formData: FormData) {
  return memberFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    preferredName: formData.get("preferredName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    gender: formData.get("gender"),
    birthDate: formData.get("birthDate"),
    maritalStatus: formData.get("maritalStatus"),
    occupation: formData.get("occupation"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
    campusId: formData.get("campusId"),
    emergencyContactName: formData.get("emergencyContactName"),
    emergencyContactPhone: formData.get("emergencyContactPhone"),
    notes: formData.get("notes"),
    status: formData.get("status"),
    membershipDate: formData.get("membershipDate"),
    baptismDate: formData.get("baptismDate"),
    salvationDate: formData.get("salvationDate"),
    previousChurch: formData.get("previousChurch"),
    department: formData.get("department"),
  });
}

export async function createMember(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const check = await checkPermission("members.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un membre." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const supabase = await createClient();

  const { data: person, error: personError } = await supabase
    .from("people")
    .insert({
      organization_id: organizationId,
      campus_id: orNull(v.campusId),
      first_name: v.firstName,
      last_name: v.lastName,
      preferred_name: orNull(v.preferredName),
      email: orNull(v.email),
      phone: orNull(v.phone),
      gender: v.gender,
      birth_date: orNull(v.birthDate),
      marital_status: orNull(v.maritalStatus),
      occupation: orNull(v.occupation),
      address_line1: orNull(v.addressLine1),
      city: orNull(v.city),
      emergency_contact_name: orNull(v.emergencyContactName),
      emergency_contact_phone: orNull(v.emergencyContactPhone),
      notes: orNull(v.notes),
    })
    .select("id")
    .single();
  if (personError) return { error: personError.message };

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      organization_id: organizationId,
      person_id: person.id,
      status: v.status,
      membership_date: orNull(v.membershipDate),
      baptism_date: orNull(v.baptismDate),
      salvation_date: orNull(v.salvationDate),
      previous_church: orNull(v.previousChurch),
      department: orNull(v.department),
    })
    .select("id")
    .single();
  if (memberError) {
    // La personne existe déjà mais l'adhésion a échoué — on la laisse : elle est réutilisable
    // (aucune donnée orpheline dangereuse, une `people` sans `members` est un état valide ailleurs
    // dans le schéma, ex. visiteurs).
    return { error: memberError.message };
  }

  revalidatePath("/members");
  redirect(`/members/${member.id}`);
}

export async function updateMember(
  memberId: string,
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce membre." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("members")
    .select("person_id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .single();
  if (fetchError || !existing) return { error: "Membre introuvable." };

  const { error: personError } = await supabase
    .from("people")
    .update({
      campus_id: orNull(v.campusId),
      first_name: v.firstName,
      last_name: v.lastName,
      preferred_name: orNull(v.preferredName),
      email: orNull(v.email),
      phone: orNull(v.phone),
      gender: v.gender,
      birth_date: orNull(v.birthDate),
      marital_status: orNull(v.maritalStatus),
      occupation: orNull(v.occupation),
      address_line1: orNull(v.addressLine1),
      city: orNull(v.city),
      emergency_contact_name: orNull(v.emergencyContactName),
      emergency_contact_phone: orNull(v.emergencyContactPhone),
      notes: orNull(v.notes),
    })
    .eq("id", existing.person_id)
    .eq("organization_id", organizationId);
  if (personError) return { error: personError.message };

  const { error: memberError } = await supabase
    .from("members")
    .update({
      status: v.status,
      membership_date: orNull(v.membershipDate),
      baptism_date: orNull(v.baptismDate),
      salvation_date: orNull(v.salvationDate),
      previous_church: orNull(v.previousChurch),
      department: orNull(v.department),
    })
    .eq("id", memberId)
    .eq("organization_id", organizationId);
  if (memberError) return { error: memberError.message };

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  redirect(`/members/${memberId}`);
}

/**
 * "Suppression" = archivage (`status = 'archived'`), pas un `DELETE` réel : la policy RLS de
 * suppression sur les tables métier exige `is_org_admin()` (voir
 * docs/architecture/03-multi-tenancy-and-rls.md), donc un rôle avec seulement `members.delete`
 * (ex. PASTOR) serait bloqué par RLS malgré la permission applicative. Archiver évite cette
 * incohérence, est réversible, et préserve l'historique (présences, suivis pastoraux...) qui
 * référence cette personne.
 */
export async function archiveMember(memberId: string): Promise<MemberActionState> {
  const check = await checkPermission("members.delete");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'archiver ce membre." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ status: "archived" })
    .eq("id", memberId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/members");
  revalidatePath(`/members/${memberId}`);
  return {};
}
