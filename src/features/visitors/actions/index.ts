"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { visitorFormSchema } from "@/features/visitors/schemas";

export interface VisitorActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseForm(formData: FormData) {
  return visitorFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    source: formData.get("source"),
    firstVisitDate: formData.get("firstVisitDate"),
    invitedByPersonId: formData.get("invitedByPersonId"),
    followUpDate: formData.get("followUpDate"),
    notes: formData.get("notes"),
  });
}

export async function createVisitor(_prev: VisitorActionState, formData: FormData): Promise<VisitorActionState> {
  const check = await checkPermission("members.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'ajouter un visiteur." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const supabase = await createClient();

  const { data: person, error: personError } = await supabase
    .from("people")
    .insert({
      organization_id: organizationId,
      first_name: v.firstName,
      last_name: v.lastName,
      email: orNull(v.email),
      phone: orNull(v.phone),
    })
    .select("id")
    .single();
  if (personError) return { error: personError.message };

  const { error: visitorError } = await supabase.from("visitors").insert({
    organization_id: organizationId,
    person_id: person.id,
    source: orNull(v.source),
    first_visit_date: v.firstVisitDate || new Date().toISOString().slice(0, 10),
    invited_by_person_id: orNull(v.invitedByPersonId),
    follow_up_date: orNull(v.followUpDate),
    notes: orNull(v.notes),
  });
  if (visitorError) return { error: visitorError.message };

  revalidatePath("/visitors");
  return { success: true };
}

export async function updateVisitor(
  visitorId: string,
  _prev: VisitorActionState,
  formData: FormData,
): Promise<VisitorActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce visiteur." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("visitors")
    .select("person_id")
    .eq("id", visitorId)
    .eq("organization_id", organizationId)
    .single();
  if (fetchError || !existing) return { error: "Visiteur introuvable." };

  const { error: personError } = await supabase
    .from("people")
    .update({ first_name: v.firstName, last_name: v.lastName, email: orNull(v.email), phone: orNull(v.phone) })
    .eq("id", existing.person_id)
    .eq("organization_id", organizationId);
  if (personError) return { error: personError.message };

  const { error: visitorError } = await supabase
    .from("visitors")
    .update({
      source: orNull(v.source),
      first_visit_date: orNull(v.firstVisitDate),
      invited_by_person_id: orNull(v.invitedByPersonId),
      follow_up_date: orNull(v.followUpDate),
      notes: orNull(v.notes),
    })
    .eq("id", visitorId)
    .eq("organization_id", organizationId);
  if (visitorError) return { error: visitorError.message };

  revalidatePath("/visitors");
  revalidatePath(`/visitors/${visitorId}`);
  return { success: true };
}

const VISITOR_STATUSES = ["new", "contacted", "follow_up", "connected", "converted", "lost", "archived"] as const;

export async function updateVisitorStatus(
  visitorId: string,
  status: (typeof VISITOR_STATUSES)[number],
): Promise<VisitorActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce visiteur." };
  if (!VISITOR_STATUSES.includes(status)) return { error: "Statut invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("visitors")
    .update({ status })
    .eq("id", visitorId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/visitors");
  revalidatePath(`/visitors/${visitorId}`);
  return {};
}

/** Crée une vraie adhésion (`public.members`) à partir de la même personne, et marque le
 * visiteur comme converti — un visiteur "converti" n'est pas supprimé : il garde son historique
 * de visite, juste relié à sa nouvelle fiche membre via `converted_to_member_id`. */
export async function convertVisitorToMember(visitorId: string): Promise<VisitorActionState> {
  const check = await checkPermission("members.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de convertir ce visiteur." };

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();

  const { data: visitor, error: fetchError } = await supabase
    .from("visitors")
    .select("person_id, status")
    .eq("id", visitorId)
    .eq("organization_id", organizationId)
    .single();
  if (fetchError || !visitor) return { error: "Visiteur introuvable." };
  if (visitor.status === "converted") return { error: "Ce visiteur est déjà converti." };

  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({ organization_id: organizationId, person_id: visitor.person_id, status: "active" })
    .select("id")
    .single();
  if (memberError) {
    if (memberError.message.includes("duplicate") || memberError.message.includes("unique")) {
      return { error: "Cette personne est déjà membre." };
    }
    return { error: memberError.message };
  }

  const { error: visitorError } = await supabase
    .from("visitors")
    .update({ status: "converted", converted_to_member_id: member.id })
    .eq("id", visitorId)
    .eq("organization_id", organizationId);
  if (visitorError) return { error: visitorError.message };

  revalidatePath("/visitors");
  revalidatePath(`/visitors/${visitorId}`);
  redirect(`/members/${member.id}`);
}
