import "server-only";
import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  authUsers,
  membershipRoles,
  organizationMemberships,
  permissions as permissionsTable,
  profiles,
  rolePermissions,
  roles,
} from "@/lib/db/schema";

export interface MemberRole {
  id: string;
  code: string;
  name: string;
}

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  title: string | null;
  status: string;
  joinedAt: Date | null;
  invitedAt: Date | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  lastSignInAt: Date | null;
  roles: MemberRole[];
}

export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
  const memberships = await db
    .select({
      membershipId: organizationMemberships.id,
      userId: organizationMemberships.userId,
      title: organizationMemberships.title,
      status: organizationMemberships.status,
      joinedAt: organizationMemberships.joinedAt,
      invitedAt: organizationMemberships.invitedAt,
      firstName: profiles.firstName,
      lastName: profiles.lastName,
      displayName: profiles.displayName,
      avatarUrl: profiles.avatarUrl,
      email: authUsers.email,
      lastSignInAt: authUsers.lastSignInAt,
    })
    .from(organizationMemberships)
    .leftJoin(profiles, eq(profiles.id, organizationMemberships.userId))
    .leftJoin(authUsers, eq(authUsers.id, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, organizationId));

  const membershipIds = memberships.map((m) => m.membershipId);
  const roleRows = membershipIds.length
    ? await db
        .select({
          membershipId: membershipRoles.membershipId,
          id: roles.id,
          code: roles.code,
          name: roles.name,
        })
        .from(membershipRoles)
        .innerJoin(roles, eq(roles.id, membershipRoles.roleId))
        .where(inArray(membershipRoles.membershipId, membershipIds))
    : [];

  const rolesByMembership = new Map<string, MemberRole[]>();
  for (const r of roleRows) {
    const arr = rolesByMembership.get(r.membershipId) ?? [];
    arr.push({ id: r.id, code: r.code, name: r.name });
    rolesByMembership.set(r.membershipId, arr);
  }

  return memberships
    .map((m) => ({ ...m, roles: rolesByMembership.get(m.membershipId) ?? [] }))
    .sort((a, b) => (a.displayName ?? a.email ?? "").localeCompare(b.displayName ?? b.email ?? ""));
}

/** Membres actifs de l'organisation sous la forme `{id, name}`, pour peupler un `<select>`
 * "Assigné à" — jamais tous les `auth.users` de l'instance Supabase (fuite inter-organisation).
 * Partagé par pastoral/prayer/visits/pastoral-council. */
export async function getAssignableMembers(organizationId: string): Promise<{ id: string; name: string }[]> {
  const members = await getOrganizationMembers(organizationId);
  return members
    .filter((m) => m.status === "active")
    .map((m) => ({ id: m.userId, name: m.displayName || [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email || "—" }));
}

export async function getOrganizationRoles(organizationId: string) {
  return db
    .select()
    .from(roles)
    .where(eq(roles.organizationId, organizationId))
    .orderBy(asc(roles.isSystem), asc(roles.name));
}

export async function getAllPermissions() {
  return db.select().from(permissionsTable).orderBy(asc(permissionsTable.module), asc(permissionsTable.code));
}

/** Map `roleId -> Set<permissionCode>` pour toute l'organisation (une requête, pas une par
 * rôle) — utilisé par la matrice de permissions de `/settings/roles`. */
export async function getRolePermissionsByRole(
  roleIds: string[],
): Promise<Map<string, Set<string>>> {
  if (!roleIds.length) return new Map();
  const rows = await db
    .select({ roleId: rolePermissions.roleId, code: permissionsTable.code })
    .from(rolePermissions)
    .innerJoin(permissionsTable, eq(permissionsTable.id, rolePermissions.permissionId))
    .where(inArray(rolePermissions.roleId, roleIds));

  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = map.get(row.roleId) ?? new Set<string>();
    set.add(row.code);
    map.set(row.roleId, set);
  }
  return map;
}
