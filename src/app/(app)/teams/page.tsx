import { ShieldCheck } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { getTeams } from "@/features/teams/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { getMinistriesForSelect } from "@/features/ministries/services";
import { createTeam } from "@/features/teams/actions";
import { TeamFormDialog } from "@/features/teams/components/team-form-dialog";
import { TeamCard } from "@/features/teams/components/team-card";

export default async function TeamsPage() {
  const check = await checkPermission("teams.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Équipes" description="Les équipes de service de votre église." />
        <PermissionDenied requiredPermission="teams.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("teams.create") || check.context.permissions.has("teams.update");

  const [teams, people, ministries] = await Promise.all([
    getTeams(organizationId),
    getPeopleForSelect(organizationId),
    getMinistriesForSelect(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Équipes"
        description="Les équipes de service de votre église."
        actions={canManage ? <TeamFormDialog action={createTeam} people={people} ministries={ministries} /> : undefined}
      />

      {teams.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Aucune équipe" description="Créez la première équipe de votre église." />
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              organizationId={organizationId}
              team={team}
              people={people}
              ministries={ministries}
              canManage={canManage}
              isAdmin={check.context.isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
