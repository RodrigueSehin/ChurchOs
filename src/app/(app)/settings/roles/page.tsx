import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getAllPermissions, getOrganizationRoles, getRolePermissionsByRole } from "@/features/rbac/queries";
import { RolesMatrix } from "@/features/rbac/components/roles-matrix";

export default async function RolesSettingsPage() {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Rôles" description="Rôles et permissions de l'organisation." />
        <PermissionDenied requiredPermission="settings.manage" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const [roles, permissions] = await Promise.all([
    getOrganizationRoles(organizationId),
    getAllPermissions(),
  ]);
  const rolePermissionsMap = await getRolePermissionsByRole(roles.map((r) => r.id));
  const rolePermissions = Object.fromEntries(
    Array.from(rolePermissionsMap.entries()).map(([roleId, set]) => [roleId, Array.from(set)]),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rôles" description="Rôles et permissions de l'organisation." />
      <RolesMatrix roles={roles} permissions={permissions} rolePermissions={rolePermissions} />
    </div>
  );
}
