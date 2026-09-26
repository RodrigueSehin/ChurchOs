"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { findWorkerConflicts, formatConflictMessage } from "@/lib/scheduling/conflict-detection";
import { planningSlotSchema } from "@/features/planning/schemas";

export interface PlanningActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parsePlanningForm(formData: FormData) {
  return planningSlotSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    assignedToWorkerId: formData.get("assignedToWorkerId"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  });
}

/** Détection de conflits de planning (critère de sortie de la Phase 7, voir
 * `lib/scheduling/conflict-detection.ts`) : si un ouvrier est sélectionné, refuse la création si
 * il est déjà occupé (autre créneau de planning ou service) sur le même horaire. */
export async function createPlanningSlot(_prev: PlanningActionState, formData: FormData): Promise<PlanningActionState> {
  const check = await checkPermission("planning.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un créneau de planning." };

  const parsed = parsePlanningForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  if (v.assignedToWorkerId) {
    const startsAt = new Date(v.startsAt);
    const endsAt = v.endsAt ? new Date(v.endsAt) : null;
    const conflicts = await findWorkerConflicts({ organizationId, workerId: v.assignedToWorkerId, startsAt, endsAt });
    if (conflicts.length > 0) return { error: formatConflictMessage(conflicts) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("planning_slots").insert({
    organization_id: organizationId,
    title: v.title,
    category: orNull(v.category),
    starts_at: v.startsAt,
    ends_at: orNull(v.endsAt),
    location: orNull(v.location),
    assigned_to_worker_id: orNull(v.assignedToWorkerId),
    status: v.status,
    notes: orNull(v.notes),
  });
  if (error) return { error: error.message };

  revalidatePath("/planning");
  return { success: true };
}

export async function updatePlanningSlot(
  slotId: string,
  _prev: PlanningActionState,
  formData: FormData,
): Promise<PlanningActionState> {
  const check = await checkPermission("planning.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce créneau." };

  const parsed = parsePlanningForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  if (v.assignedToWorkerId) {
    const startsAt = new Date(v.startsAt);
    const endsAt = v.endsAt ? new Date(v.endsAt) : null;
    const conflicts = await findWorkerConflicts({
      organizationId,
      workerId: v.assignedToWorkerId,
      startsAt,
      endsAt,
      excludePlanningSlotId: slotId,
    });
    if (conflicts.length > 0) return { error: formatConflictMessage(conflicts) };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planning_slots")
    .update({
      title: v.title,
      category: orNull(v.category),
      starts_at: v.startsAt,
      ends_at: orNull(v.endsAt),
      location: orNull(v.location),
      assigned_to_worker_id: orNull(v.assignedToWorkerId),
      status: v.status,
      notes: orNull(v.notes),
    })
    .eq("id", slotId)
    .eq("organization_id", organizationId);
  if (error) return { error: error.message };

  revalidatePath("/planning");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). */
export async function deletePlanningSlot(slotId: string): Promise<PlanningActionState> {
  const check = await checkPermission("planning.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un créneau de planning." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("planning_slots")
    .delete()
    .eq("id", slotId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/planning");
  return { success: true };
}
