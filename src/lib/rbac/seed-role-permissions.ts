import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

import { ROLE_PERMISSIONS, type SystemRole } from "./permissions";

/**
 * `db/schema.sql` seed le catalogue `permissions` et les 9 `roles` système par organisation
 * (trigger `bootstrap_organization()`), mais ne seed jamais `role_permissions` — voir
 * docs/architecture/04-rbac-permissions.md#role_permissions--pas-encore-seedé-côté-base.
 * `db/seed/index.ts` le fait pour l'organisation de démo ; cette fonction fait l'équivalent pour
 * une organisation réelle, appelée juste après sa création (`finalizeOnboarding`).
 *
 * Prend le client Supabase de la session appelante (pas le client admin) : la policy RLS
 * `role_permissions_manage_admin` exige `is_org_admin(organization_id)`, que le créateur de
 * l'organisation (rôle CHURCH_OWNER) satisfait déjà à ce stade. `upsert` avec `onConflict` pour
 * rester idempotent si l'action de finalisation est rejouée.
 */
export async function seedRolePermissionsForOrganization(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ error?: string }> {
  const { data: orgRoles, error: rolesError } = await supabase
    .from("roles")
    .select("id, code")
    .eq("organization_id", organizationId);
  if (rolesError) return { error: rolesError.message };
  if (!orgRoles?.length) return {};

  const { data: allPermissions, error: permissionsError } = await supabase
    .from("permissions")
    .select("id, code");
  if (permissionsError) return { error: permissionsError.message };
  if (!allPermissions?.length) return {};

  const permissionIdByCode = new Map<string, string>(allPermissions.map((p) => [p.code, p.id]));

  const rows: { role_id: string; permission_id: string }[] = [];
  for (const role of orgRoles) {
    const codes = ROLE_PERMISSIONS[role.code as SystemRole];
    if (!codes) continue;
    for (const code of codes) {
      const permissionId = permissionIdByCode.get(code);
      if (permissionId) rows.push({ role_id: role.id, permission_id: permissionId });
    }
  }
  if (!rows.length) return {};

  const { error: insertError } = await supabase
    .from("role_permissions")
    .upsert(rows, { onConflict: "role_id,permission_id", ignoreDuplicates: true });
  if (insertError) return { error: insertError.message };

  return {};
}
