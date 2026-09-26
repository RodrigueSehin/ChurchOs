import "server-only";

import { requireOrganization, requireUser, type CurrentUser } from "./session";
import { resolveMembershipContext, type MembershipContext } from "@/lib/rbac/resolve";
import type { PermissionCode } from "@/lib/rbac/permissions";

export interface PermissionCheck {
  allowed: boolean;
  user: CurrentUser;
  organization: Awaited<ReturnType<typeof requireOrganization>>;
  context: MembershipContext;
}

/**
 * Vérification de permission fine — toujours applicative (RLS ne connaît que
 * `is_org_member`/`is_org_admin`, pas les codes de `permissions`, voir
 * docs/architecture/04-rbac-permissions.md). Ne redirige jamais : renvoie `allowed: false` pour
 * que l'appelant décide (page → `<PermissionDenied/>`, Server Action → `{ error }`). Une Server
 * Action qui ne commence pas par un `checkPermission()` explicite est un bug de sécurité.
 */
export async function checkPermission(code: PermissionCode): Promise<PermissionCheck> {
  const user = await requireUser();
  const organization = await requireOrganization(user.id);
  const context = await resolveMembershipContext(organization.membership.id);
  return { allowed: context.permissions.has(code), user, organization, context };
}
