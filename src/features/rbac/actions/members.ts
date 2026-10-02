"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { membershipRoles, organizationMemberships, roles } from "@/lib/db/schema";

export interface MemberActionState {
  error?: string;
  success?: boolean;
}

const MEMBER_STATUSES = ["active", "suspended", "left"] as const;

const ADMIN_ROLE_CODES = ["SUPER_ADMIN", "CHURCH_OWNER"];

/**
 * Change le rôle d'un utilisateur de l'église (un seul rôle principal par membre dans cette interface).
 * Garde-fous côté serveur : le membre et le rôle doivent appartenir à l'église de l'appelant ; on ne modifie pas son
 * propre rôle ; seul un administrateur peut attribuer ou retirer un rôle d'administrateur ; le dernier administrateur
 * ne peut pas être rétrogradé. Le nouveau rôle est ajouté AVANT de retirer les anciens : en cas d'échec, le membre
 * ne se retrouve jamais sans rôle. Les permissions étant résolues à chaque requête, le menu et les accès de
 * l'utilisateur changent dès son prochain chargement de page.
 */
export async function updateMemberRole(
  membershipId: string,
  roleId: string,
): Promise<MemberActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les rôles." };
  const organizationId = check.organization.organization.id;

  const [membership] = await db
    .select({ id: organizationMemberships.id, userId: organizationMemberships.userId })
    .from(organizationMemberships)
    .where(and(eq(organizationMemberships.id, membershipId), eq(organizationMemberships.organizationId, organizationId)));
  if (!membership) return { error: "Utilisateur introuvable." };
  if (membership.userId === check.user.id) return { error: "Vous ne pouvez pas modifier votre propre rôle." };

  const [newRole] = await db
    .select({ id: roles.id, code: roles.code })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)));
  if (!newRole) return { error: "Rôle introuvable." };

  const currentRoles = await db
    .select({ id: roles.id, code: roles.code })
    .from(membershipRoles)
    .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
    .where(eq(membershipRoles.membershipId, membershipId));

  const wasAdmin = currentRoles.some((r) => ADMIN_ROLE_CODES.includes(r.code));
  const becomesAdmin = ADMIN_ROLE_CODES.includes(newRole.code);
  if ((wasAdmin || becomesAdmin) && !check.context.isAdmin) {
    return { error: "Seul un administrateur peut attribuer ou retirer un rôle d'administrateur." };
  }
  if (wasAdmin && !becomesAdmin) {
    const [others] = await db
      .select({ value: sql<number>`count(distinct ${organizationMemberships.id})::int` })
      .from(membershipRoles)
      .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
      .innerJoin(organizationMemberships, eq(organizationMemberships.id, membershipRoles.membershipId))
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.status, "active"),
          inArray(roles.code, ADMIN_ROLE_CODES),
          ne(organizationMemberships.id, membershipId),
        ),
      );
    if ((others?.value ?? 0) === 0) return { error: "Impossible : l'église doit garder au moins un administrateur." };
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase
    .from("membership_roles")
    .upsert({ membership_id: membershipId, role_id: roleId }, { onConflict: "membership_id,role_id", ignoreDuplicates: true });
  if (insertError) return { error: insertError.message };

  const { error: deleteError } = await supabase
    .from("membership_roles")
    .delete()
    .eq("membership_id", membershipId)
    .neq("role_id", roleId);
  if (deleteError) return { error: deleteError.message };

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
