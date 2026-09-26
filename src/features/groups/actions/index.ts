"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { addGroupMemberSchema, groupSchema } from "@/features/groups/schemas";

export interface GroupActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseGroupForm(formData: FormData) {
  return groupSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    type: formData.get("type"),
    description: formData.get("description"),
    leaderPersonId: formData.get("leaderPersonId"),
    meetingDay: formData.get("meetingDay"),
    meetingTime: formData.get("meetingTime"),
    meetingLocation: formData.get("meetingLocation"),
    capacity: formData.get("capacity"),
  });
}

export async function createGroup(_prev: GroupActionState, formData: FormData): Promise<GroupActionState> {
  const check = await checkPermission("members.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un groupe." };

  const parsed = parseGroupForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("groups").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    code: orNull(v.code),
    type: v.type,
    description: orNull(v.description),
    leader_person_id: orNull(v.leaderPersonId),
    meeting_day: v.meetingDay ? Number(v.meetingDay) : null,
    meeting_time: orNull(v.meetingTime),
    meeting_location: orNull(v.meetingLocation),
    capacity: v.capacity ? Number(v.capacity) : null,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un groupe avec ce nom (ou ce code) existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/groups");
  return { success: true };
}

export async function updateGroup(
  groupId: string,
  _prev: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce groupe." };

  const parsed = parseGroupForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .update({
      name: v.name,
      code: orNull(v.code),
      type: v.type,
      description: orNull(v.description),
      leader_person_id: orNull(v.leaderPersonId),
      meeting_day: v.meetingDay ? Number(v.meetingDay) : null,
      meeting_time: orNull(v.meetingTime),
      meeting_location: orNull(v.meetingLocation),
      capacity: v.capacity ? Number(v.capacity) : null,
    })
    .eq("id", groupId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`) — voir la même note dans
 * `features/families/actions/index.ts`. */
export async function deleteGroup(groupId: string): Promise<GroupActionState> {
  const check = await checkPermission("members.delete");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un groupe." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/groups");
  return { success: true };
}

export async function addGroupMember(
  groupId: string,
  _prev: GroupActionState,
  formData: FormData,
): Promise<GroupActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce groupe." };

  const parsed = addGroupMemberSchema.safeParse({
    personId: formData.get("personId"),
    role: formData.get("role") || "member",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("group_members").upsert(
    {
      organization_id: check.organization.organization.id,
      group_id: groupId,
      person_id: v.personId,
      role: v.role,
      joined_at: new Date().toISOString().slice(0, 10),
      is_active: true,
    },
    { onConflict: "group_id,person_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

/** Retrait = `is_active = false` (colonne dédiée sur `group_members`), pas un `DELETE` — reste
 * possible pour n'importe quel rôle avec `members.update` (pas seulement les admins), et garde
 * l'historique de participation. */
export async function removeGroupMember(groupId: string, groupMemberId: string): Promise<GroupActionState> {
  const check = await checkPermission("members.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce groupe." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("group_members")
    .update({ is_active: false, left_at: new Date().toISOString().slice(0, 10) })
    .eq("id", groupMemberId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}
