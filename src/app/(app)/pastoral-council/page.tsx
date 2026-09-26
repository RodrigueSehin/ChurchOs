import { Gavel } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { getAssignableUsers, getPastoralCouncils } from "@/features/pastoral-council/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { CouncilFormDialog } from "@/features/pastoral-council/components/council-form-dialog";
import { CouncilCard } from "@/features/pastoral-council/components/council-card";

export default async function PastoralCouncilPage() {
  const check = await checkPermission("pastoral_council.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Conseil pastoral" description="Réunions, ordre du jour, décisions, actions et procès-verbaux du conseil pastoral." />
        <PermissionDenied requiredPermission="pastoral_council.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("pastoral_council.manage");

  const [councils, people, assignableUsers] = await Promise.all([
    getPastoralCouncils(organizationId),
    getPeopleForSelect(organizationId),
    getAssignableUsers(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conseil pastoral"
        description="Réunions, ordre du jour, décisions, actions et procès-verbaux du conseil pastoral."
        actions={canManage ? <CouncilFormDialog /> : undefined}
      />

      {councils.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="Aucune réunion"
          description="Planifiez la première réunion du conseil pastoral de votre église."
          action={canManage ? <CouncilFormDialog /> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {councils.map((council) => (
            <CouncilCard
              key={council.id}
              organizationId={organizationId}
              council={council}
              people={people}
              assignableUsers={assignableUsers}
              canManage={canManage}
              isAdmin={check.context.isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
