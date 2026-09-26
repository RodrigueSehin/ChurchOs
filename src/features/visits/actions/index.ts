"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { visitSchema } from "@/features/visits/schemas";

export interface VisitActionState {
  error?: string;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseForm(formData: FormData) {
  return visitSchema.safeParse({
    personId: formData.get("personId"),
    visitType: formData.get("visitType"),
    scheduledAt: formData.get("scheduledAt"),
    location: formData.get("location"),
    assignedToUserId: formData.get("assignedToUserId"),
    status: formData.get("status"),
    purpose: formData.get("purpose"),
    summary: formData.get("summary"),
    nextAction: formData.get("nextAction"),
    nextActionDate: formData.get("nextActionDate"),
  });
}

export async function createVisit(_prev: VisitActionState, formData: FormData): Promise<VisitActionState> {
  const check = await checkPermission("visits.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une visite." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const supabase = await createClient();
  const { error } = await supabase.from("visits").insert({
    organization_id: organizationId,
    person_id: v.personId,
    visit_type: v.visitType,
    scheduled_at: orNull(v.scheduledAt),
    location: orNull(v.location),
    assigned_to_user_id: orNull(v.assignedToUserId),
    status: v.status,
    purpose: orNull(v.purpose),
    summary: orNull(v.summary),
    next_action: orNull(v.nextAction),
    next_action_date: orNull(v.nextActionDate),
    created_by: check.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/visits");
  redirect("/visits");
}

export async function updateVisit(id: string, _prev: VisitActionState, formData: FormData): Promise<VisitActionState> {
  const check = await checkPermission("visits.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette visite." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("visits")
    .update({
      person_id: v.personId,
      visit_type: v.visitType,
      scheduled_at: orNull(v.scheduledAt),
      location: orNull(v.location),
      assigned_to_user_id: orNull(v.assignedToUserId),
      status: v.status,
      purpose: orNull(v.purpose),
      summary: orNull(v.summary),
      next_action: orNull(v.nextAction),
      next_action_date: orNull(v.nextActionDate),
      completed_at: v.status === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/visits");
  return {};
}
