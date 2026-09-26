"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { addPrayerUpdateSchema, markAnsweredSchema, prayerRequestSchema } from "@/features/prayer/schemas";

export interface PrayerActionState {
  error?: string;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseForm(formData: FormData) {
  return prayerRequestSchema.safeParse({
    personId: formData.get("personId"),
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    status: formData.get("status"),
    priority: formData.get("priority"),
    isConfidential: formData.get("isConfidential") === "on",
    assignedToUserId: formData.get("assignedToUserId"),
  });
}

export async function createPrayerRequest(_prev: PrayerActionState, formData: FormData): Promise<PrayerActionState> {
  const check = await checkPermission("prayer.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un sujet de prière." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("prayer_requests")
    .insert({
      organization_id: organizationId,
      person_id: orNull(v.personId),
      title: v.title,
      description: orNull(v.description),
      category: orNull(v.category),
      status: v.status,
      priority: v.priority,
      is_confidential: v.isConfidential,
      assigned_to_user_id: orNull(v.assignedToUserId),
      created_by: check.user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/prayer");
  redirect(`/prayer/${data.id}`);
}

export async function updatePrayerRequest(id: string, _prev: PrayerActionState, formData: FormData): Promise<PrayerActionState> {
  const check = await checkPermission("prayer.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce sujet." };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("prayer_requests")
    .update({
      person_id: orNull(v.personId),
      title: v.title,
      description: orNull(v.description),
      category: orNull(v.category),
      status: v.status,
      priority: v.priority,
      is_confidential: v.isConfidential,
      assigned_to_user_id: orNull(v.assignedToUserId),
    })
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/prayer");
  revalidatePath(`/prayer/${id}`);
  return {};
}

export async function markPrayerAnswered(id: string, _prev: PrayerActionState, formData: FormData): Promise<PrayerActionState> {
  const check = await checkPermission("prayer.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce sujet." };

  const parsed = markAnsweredSchema.safeParse({ answerTestimony: formData.get("answerTestimony") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("prayer_requests")
    .update({
      status: "answered",
      answered_at: new Date().toISOString(),
      answer_testimony: orNull(parsed.data.answerTestimony),
    })
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/prayer");
  revalidatePath(`/prayer/${id}`);
  return {};
}

/** "Supprimer" = archiver (`status = 'archived'`) — la policy RLS `delete` générique exige
 * `is_org_admin()`, voir la même note dans `features/pastoral/actions/index.ts`. */
export async function archivePrayerRequest(id: string): Promise<PrayerActionState> {
  const check = await checkPermission("prayer.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'archiver ce sujet." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("prayer_requests")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/prayer");
  revalidatePath(`/prayer/${id}`);
  return {};
}

export async function addPrayerUpdate(prayerRequestId: string, _prev: PrayerActionState, formData: FormData): Promise<PrayerActionState> {
  const check = await checkPermission("prayer.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'ajouter une mise à jour." };

  const parsed = addPrayerUpdateSchema.safeParse({ content: formData.get("content") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const { error } = await supabase.from("prayer_updates").insert({
    organization_id: check.organization.organization.id,
    prayer_request_id: prayerRequestId,
    author_user_id: check.user.id,
    content: parsed.data.content,
  });
  if (error) return { error: error.message };

  revalidatePath(`/prayer/${prayerRequestId}`);
  return {};
}
