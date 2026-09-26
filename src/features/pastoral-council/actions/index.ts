"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { councilActionSchema, councilMemberSchema, councilSchema } from "@/features/pastoral-council/schemas";

export interface CouncilActionState {
  error?: string;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createCouncil(_prev: CouncilActionState, formData: FormData): Promise<CouncilActionState> {
  const check = await checkPermission("pastoral_council.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une réunion du conseil pastoral." };

  const parsed = councilSchema.safeParse({
    title: formData.get("title"),
    meetingAt: formData.get("meetingAt"),
    location: formData.get("location"),
    agenda: formData.get("agenda"),
    minutes: formData.get("minutes"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("pastoral_councils").insert({
    organization_id: check.organization.organization.id,
    title: v.title,
    meeting_at: v.meetingAt,
    location: orNull(v.location),
    agenda: orNull(v.agenda),
    minutes: orNull(v.minutes),
    status: v.status,
    created_by: check.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/pastoral-council");
  return {};
}

export async function updateCouncil(id: string, _prev: CouncilActionState, formData: FormData): Promise<CouncilActionState> {
  const check = await checkPermission("pastoral_council.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette réunion." };

  const parsed = councilSchema.safeParse({
    title: formData.get("title"),
    meetingAt: formData.get("meetingAt"),
    location: formData.get("location"),
    agenda: formData.get("agenda"),
    minutes: formData.get("minutes"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_councils")
    .update({
      title: v.title,
      meeting_at: v.meetingAt,
      location: orNull(v.location),
      agenda: orNull(v.agenda),
      minutes: orNull(v.minutes),
      status: v.status,
    })
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/pastoral-council");
  return {};
}

/** Suppression réelle (cascade sur les membres/actions du conseil) — la policy RLS `delete`
 * générique exige `is_org_admin()`, voir la même note dans `features/families/actions/index.ts`. */
export async function deleteCouncil(id: string): Promise<CouncilActionState> {
  const check = await checkPermission("pastoral_council.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une réunion du conseil pastoral." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_councils")
    .delete()
    .eq("id", id)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/pastoral-council");
  return {};
}

export async function addCouncilMember(councilId: string, _prev: CouncilActionState, formData: FormData): Promise<CouncilActionState> {
  const check = await checkPermission("pastoral_council.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette réunion." };

  const parsed = councilMemberSchema.safeParse({
    personId: formData.get("personId"),
    userId: formData.get("userId"),
    attendanceStatus: formData.get("attendanceStatus"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("pastoral_council_members").insert({
    organization_id: check.organization.organization.id,
    council_id: councilId,
    person_id: orNull(v.personId),
    user_id: orNull(v.userId),
    attendance_status: orNull(v.attendanceStatus ?? ""),
  });
  if (error) return { error: error.message };

  revalidatePath("/pastoral-council");
  return {};
}

/** Suppression réelle — la policy RLS `delete` générique exige `is_org_admin()`. */
export async function removeCouncilMember(memberId: string): Promise<CouncilActionState> {
  const check = await checkPermission("pastoral_council.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut retirer un participant." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_council_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/pastoral-council");
  return {};
}

export async function createCouncilAction(councilId: string, _prev: CouncilActionState, formData: FormData): Promise<CouncilActionState> {
  const check = await checkPermission("pastoral_council.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette réunion." };

  const parsed = councilActionSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignedToUserId: formData.get("assignedToUserId"),
    dueDate: formData.get("dueDate"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("pastoral_actions").insert({
    organization_id: check.organization.organization.id,
    council_id: councilId,
    title: v.title,
    description: orNull(v.description),
    assigned_to_user_id: orNull(v.assignedToUserId),
    due_date: orNull(v.dueDate),
    status: v.status,
  });
  if (error) return { error: error.message };

  revalidatePath("/pastoral-council");
  return {};
}

export async function updateCouncilActionStatus(actionId: string, status: string): Promise<CouncilActionState> {
  const check = await checkPermission("pastoral_council.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette action." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("pastoral_actions")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", actionId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/pastoral-council");
  return {};
}
