import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getOrganizationMembers, getOrganizationRoles } from "@/features/rbac/queries";
import { MembersTable } from "@/features/rbac/components/members-table";
import { InviteMemberDialog } from "@/features/rbac/components/invite-member-dialog";

export default async function UsersSettingsPage() {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Utilisateurs" description="Utilisateurs de l'organisation et leurs rôles." />
        <PermissionDenied requiredPermission="settings.manage" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const [members, roles] = await Promise.all([
    getOrganizationMembers(organizationId),
    getOrganizationRoles(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Utilisateurs"
        description="Utilisateurs de l'organisation et leurs rôles."
        actions={<InviteMemberDialog roles={roles} />}
      />
      <MembersTable members={members} roles={roles} currentUserId={check.user.id} />
    </div>
  );
}
