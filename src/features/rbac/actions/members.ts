"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export interface MemberActionState {
  error?: string;
  success?: boolean;
}

const MEMBER_STATUSES = ["active", "suspended", "left"] as const;

export async function updateMemberRole(
  membershipId: string,
  roleId: string,
): Promise<MemberActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les rôles." };

  const supabase = await createClient();

  // Un seul rôle "principal" par membre dans cette UI, même si le schéma autorise plusieurs
  // rôles par membership (table d'association) — remplace plutôt que d'accumuler.
  const { error: deleteError } = await supabase
    .from("membership_roles")
    .delete()
    .eq("membership_id", membershipId);
  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabase
    .from("membership_roles")
    .insert({ membership_id: membershipId, role_id: roleId });
  if (insertError) return { error: insertError.message };

  revalidatePath("/settings/users");
  return { success: true };
}

export async function updateMemberStatus(
  membershipId: string,
  status: (typeof MEMBER_STATUSES)[number],
): Promise<MemberActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les membres." };

  if (!MEMBER_STATUSES.includes(status)) return { error: "Statut invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_memberships")
    .update({ status })
    .eq("id", membershipId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/users");
  return { success: true };
}

const updateTitleSchema = z.object({ title: z.string().max(120).optional().default("") });

export async function updateMemberTitle(
  membershipId: string,
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les membres." };

  const parsed = updateTitleSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success) return { error: "Titre invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_memberships")
    .update({ title: parsed.data.title.trim() || null })
    .eq("id", membershipId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/settings/users");
  return { success: true };
}
