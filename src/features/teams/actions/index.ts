"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { addTeamMemberSchema, teamSchema } from "@/features/teams/schemas";

export interface TeamActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseTeamForm(formData: FormData) {
  return teamSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    ministryId: formData.get("ministryId"),
    leaderPersonId: formData.get("leaderPersonId"),
  });
}

export async function createTeam(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const check = await checkPermission("teams.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une équipe." };

  const parsed = parseTeamForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    description: orNull(v.description),
    ministry_id: orNull(v.ministryId),
    leader_person_id: orNull(v.leaderPersonId),
  });
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}

export async function updateTeam(teamId: string, _prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const check = await checkPermission("teams.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette équipe." };

  const parsed = parseTeamForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({
      name: v.name,
      description: orNull(v.description),
      ministry_id: orNull(v.ministryId),
      leader_person_id: orNull(v.leaderPersonId),
    })
    .eq("id", teamId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). */
export async function deleteTeam(teamId: string): Promise<TeamActionState> {
  const check = await checkPermission("teams.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une équipe." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", teamId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}

export async function addTeamMember(teamId: string, _prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const check = await checkPermission("teams.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette équipe." };

  const parsed = addTeamMemberSchema.safeParse({
    personId: formData.get("personId"),
    role: formData.get("role") || "member",
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("team_members").upsert(
    {
      organization_id: check.organization.organization.id,
      team_id: teamId,
      person_id: v.personId,
      role: v.role,
      status: v.status,
      joined_at: new Date().toISOString().slice(0, 10),
    },
    { onConflict: "team_id,person_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}

/** Retrait réel — `team_members` n'a pas de policy RLS `delete` pour un simple membre, seuls
 * les admins peuvent supprimer la ligne (même contrainte que pour les familles). */
export async function removeTeamMember(teamId: string, teamMemberId: string): Promise<TeamActionState> {
  const check = await checkPermission("teams.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut retirer un membre d'équipe." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("id", teamMemberId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/teams");
  return { success: true };
}
