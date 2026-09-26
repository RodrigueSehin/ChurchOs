"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { addNoteSchema, pastoralFollowupSchema } from "@/features/pastoral/schemas";

export interface PastoralActionState {
  error?: string;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseForm(formData: FormData) {
  return pastoralFollowupSchema.safeParse({
    personId: formData.get("personId"),
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    dueDate: formData.get("dueDate"),
    nextAction: formData.get("nextAction"),
    confidentiality: formData.get("confidentiality"),
    assignedToUserId: formData.get("assignedToUserId"),
  });
}

export async function createPastoralFollowup(
  _prev: PastoralActionState,
  formData: FormData,
): Promise<PastoralActionState> {
  const check = await checkPermission("pastoral.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un suivi pastoral." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pastoral_followups")
    .insert({
      organization_id: organizationId,
      person_id: v.personId,
      title: v.title,
      description: orNull(v.description),
      status: v.status,
      priority: v.priority,
      due_date: orNull(v.dueDate),
      next_action: orNull(v.nextAction),
      confidentiality: v.confidentiality,
      assigned_to_user_id: orNull(v.assignedToUserId),
      created_by: check.user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/pastoral");
  redirect(`/pastoral/${data.id}`);
}

export async function updatePastoralFollowup(
  id: string,
  _prev: PastoralActionState,
  formData: FormData,
): Promise<PastoralActionState> {
  const check = await checkPermission("pastoral.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce suivi." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_followups")
    .update({
      person_id: v.personId,
      title: v.title,
      description: orNull(v.description),
      status: v.status,
      priority: v.priority,
      due_date: orNull(v.dueDate),
      next_action: orNull(v.nextAction),
      confidentiality: v.confidentiality,
      assigned_to_user_id: orNull(v.assignedToUserId),
    })
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/pastoral");
  revalidatePath(`/pastoral/${id}`);
  return {};
}

/** "Supprimer" = archiver (`status = 'archived'`) — voir la même note que pour les membres
 * (`features/members/actions/index.ts`) : la policy RLS `delete` générique exige
 * `is_org_admin()`, qu'un rôle avec seulement `pastoral.delete` (ex. `PASTOR`) ne satisfait pas
 * forcément. */
export async function archivePastoralFollowup(id: string): Promise<PastoralActionState> {
  const check = await checkPermission("pastoral.delete");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'archiver ce suivi." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_followups")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/pastoral");
  revalidatePath(`/pastoral/${id}`);
  return {};
}

export async function addPastoralNote(
  followupId: string,
  _prev: PastoralActionState,
  formData: FormData,
): Promise<PastoralActionState> {
  const check = await checkPermission("pastoral.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'ajouter une note." };

  const parsed = addNoteSchema.safeParse({
    note: formData.get("note"),
    isPrivate: formData.get("isPrivate") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const { error } = await supabase.from("pastoral_notes").insert({
    organization_id: check.organization.organization.id,
    followup_id: followupId,
    author_user_id: check.user.id,
    note: parsed.data.note,
    is_private: parsed.data.isPrivate,
  });
  if (error) return { error: error.message };

  revalidatePath(`/pastoral/${followupId}`);
  return {};
}
