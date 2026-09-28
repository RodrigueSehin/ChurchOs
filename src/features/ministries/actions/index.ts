"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { addMinistryMemberSchema, ministrySchema } from "@/features/ministries/schemas";

export interface MinistryActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseMinistryForm(formData: FormData) {
  return ministrySchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    category: formData.get("category"),
    description: formData.get("description"),
    leaderPersonId: formData.get("leaderPersonId"),
    status: formData.get("status"),
    color: formData.get("color"),
  });
}

export async function createMinistry(_prev: MinistryActionState, formData: FormData): Promise<MinistryActionState> {
  const check = await checkPermission("ministries.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un ministère." };

  const parsed = parseMinistryForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("ministries").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    code: orNull(v.code),
    category: orNull(v.category),
    description: orNull(v.description),
    leader_person_id: orNull(v.leaderPersonId),
    status: v.status,
    color: orNull(v.color),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un ministère avec ce code existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/ministries");
  return { success: true };
}

export async function updateMinistry(
  ministryId: string,
  _prev: MinistryActionState,
  formData: FormData,
): Promise<MinistryActionState> {
  const check = await checkPermission("ministries.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce ministère." };

  const parsed = parseMinistryForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("ministries")
    .update({
      name: v.name,
      code: orNull(v.code),
      category: orNull(v.category),
      description: orNull(v.description),
      leader_person_id: orNull(v.leaderPersonId),
      status: v.status,
      color: orNull(v.color),
    })
    .eq("id", ministryId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/ministries");
  revalidatePath(`/ministries/${ministryId}`);
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`) — voir la même note dans
 * `features/families/actions/index.ts`. */
export async function deleteMinistry(ministryId: string): Promise<MinistryActionState> {
  const check = await checkPermission("ministries.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un ministère." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ministries")
    .delete()
    .eq("id", ministryId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/ministries");
  return { success: true };
}

export async function addMinistryMember(
  ministryId: string,
  _prev: MinistryActionState,
  formData: FormData,
): Promise<MinistryActionState> {
  const check = await checkPermission("ministries.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce ministère." };

  const parsed = addMinistryMemberSchema.safeParse({
    personId: formData.get("personId"),
    role: formData.get("role") || "member",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("ministry_members").upsert(
    {
      organization_id: check.organization.organization.id,
      ministry_id: ministryId,
      person_id: v.personId,
      role: v.role,
      joined_at: new Date().toISOString().slice(0, 10),
      is_active: true,
    },
    { onConflict: "ministry_id,person_id" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/ministries/${ministryId}`);
  return { success: true };
}

/** Retrait = `is_active = false` (colonne dédiée), pas un `DELETE` — reste possible pour
 * n'importe quel rôle avec `ministries.update`, garde l'historique de participation. */
export async function removeMinistryMember(ministryId: string, ministryMemberId: string): Promise<MinistryActionState> {
  const check = await checkPermission("ministries.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce ministère." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ministry_members")
    .update({ is_active: false, left_at: new Date().toISOString().slice(0, 10) })
    .eq("id", ministryMemberId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(`/ministries/${ministryId}`);
  return { success: true };
}
