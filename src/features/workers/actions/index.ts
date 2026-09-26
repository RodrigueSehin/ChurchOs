"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { skillsToArray, workerSchema } from "@/features/workers/schemas";

export interface WorkerActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseWorkerForm(formData: FormData) {
  return workerSchema.safeParse({
    personId: formData.get("personId"),
    workerNumber: formData.get("workerNumber"),
    status: formData.get("status"),
    skills: formData.get("skills"),
    notes: formData.get("notes"),
  });
}

export async function createWorker(_prev: WorkerActionState, formData: FormData): Promise<WorkerActionState> {
  const check = await checkPermission("workers.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'enregistrer un ouvrier." };

  const parsed = parseWorkerForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("workers").insert({
    organization_id: check.organization.organization.id,
    person_id: v.personId,
    worker_number: orNull(v.workerNumber),
    status: v.status,
    skills: skillsToArray(v.skills),
    notes: orNull(v.notes),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Cette personne est déjà enregistrée comme ouvrier, ou ce numéro existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/workers");
  return { success: true };
}

export async function updateWorker(workerId: string, _prev: WorkerActionState, formData: FormData): Promise<WorkerActionState> {
  const check = await checkPermission("workers.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cet ouvrier." };

  const parsed = parseWorkerForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({
      worker_number: orNull(v.workerNumber),
      status: v.status,
      skills: skillsToArray(v.skills),
      notes: orNull(v.notes),
    })
    .eq("id", workerId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/workers");
  return { success: true };
}

/** "Supprimer" = archiver (`status = 'archived'`), pas un `DELETE` réel — voir la même note dans
 * `features/members/actions/index.ts`. */
export async function archiveWorker(workerId: string): Promise<WorkerActionState> {
  const check = await checkPermission("workers.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'archiver cet ouvrier." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("workers")
    .update({ status: "archived" })
    .eq("id", workerId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/workers");
  return { success: true };
}
