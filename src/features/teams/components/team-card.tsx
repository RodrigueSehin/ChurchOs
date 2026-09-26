import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTeamMembers } from "@/features/teams/queries";
import type { getTeams } from "@/features/teams/queries";
import { TeamFormDialog } from "@/features/teams/components/team-form-dialog";
import { TeamMembersDialog } from "@/features/teams/components/team-members-dialog";
import { DeleteTeamButton } from "@/features/teams/components/delete-team-button";
import { updateTeam } from "@/features/teams/actions";

type Team = Awaited<ReturnType<typeof getTeams>>[number];

export async function TeamCard({
  organizationId,
  team,
  people,
  ministries,
  canManage,
  isAdmin,
}: {
  organizationId: string;
  team: Team;
  people: { id: string; name: string }[];
  ministries: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const members = await getTeamMembers(organizationId, team.id);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-navy">{team.name}</p>
            {team.ministryName && <Badge variant="secondary">{team.ministryName}</Badge>}
          </div>
          <p className="text-sm text-slate-400">
            {team.leaderFirstName ? `Responsable : ${team.leaderFirstName} ${team.leaderLastName}` : "Aucun responsable"}
          </p>
          {team.description && <p className="mt-1 text-sm text-slate-500">{team.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TeamMembersDialog teamId={team.id} teamName={team.name} members={members} people={people} canManage={canManage} isAdmin={isAdmin} />
          {canManage && (
            <TeamFormDialog
              action={updateTeam.bind(null, team.id)}
              people={people}
              ministries={ministries}
              team={team}
              trigger={
                <Button type="button" variant="secondary" size="sm">
                  <Pencil className="size-4" />
                  Modifier
                </Button>
              }
            />
          )}
          {isAdmin && <DeleteTeamButton teamId={team.id} teamName={team.name} />}
        </div>
      </CardContent>
    </Card>
  );
}
