import "server-only";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { membershipRoles, permissions as permissionsTable, rolePermissions, roles } from "@/lib/db/schema";
import { PERMISSIONS, type PermissionCode, type SystemRole } from "./permissions";

const ADMIN_ROLE_CODES: SystemRole[] = ["SUPER_ADMIN", "CHURCH_OWNER"];

export interface MembershipContext {
  roleCodes: string[];
  /** Miroir applicatif de `public.is_org_admin()` (RLS) : accès complet, sans avoir besoin de
   * `role_permissions` — voir docs/architecture/04-rbac-permissions.md. */
  isAdmin: boolean;
  permissions: Set<PermissionCode>;
}

/**
 * Résout les permissions effectives d'un membership (rôles → `role_permissions`). Lecture via
 * Drizzle (contourne RLS par construction, voir `lib/db/client.ts`) — c'est voulu : c'est
 * exactement la même donnée qu'un accès service-role verrait, et cette fonction EST le contrôle
 * d'accès applicatif (voir docs/architecture/04-rbac-permissions.md#vérification).
 */
export async function resolveMembershipContext(membershipId: string): Promise<MembershipContext> {
  const roleRows = await db
    .select({ id: roles.id, code: roles.code })
    .from(membershipRoles)
    .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
    .where(eq(membershipRoles.membershipId, membershipId));

  const roleCodes = roleRows.map((r) => r.code);
  const isAdmin = roleRows.some((r) => ADMIN_ROLE_CODES.includes(r.code as SystemRole));

  if (isAdmin) {
    return { roleCodes, isAdmin: true, permissions: new Set(PERMISSIONS.map((p) => p.code)) };
  }

  const roleIds = roleRows.map((r) => r.id);
  if (roleIds.length === 0) return { roleCodes, isAdmin: false, permissions: new Set() };

  const permRows = await db
    .select({ code: permissionsTable.code })
    .from(rolePermissions)
    .innerJoin(permissionsTable, eq(permissionsTable.id, rolePermissions.permissionId))
    .where(inArray(rolePermissions.roleId, roleIds));

  return {
    roleCodes,
    isAdmin: false,
    permissions: new Set(permRows.map((r) => r.code as PermissionCode)),
  };
}
