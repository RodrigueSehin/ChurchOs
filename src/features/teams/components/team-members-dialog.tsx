"use client";

import { useActionState, useState, useTransition } from "react";
import { UserRound, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { addTeamMember, removeTeamMember, type TeamActionState } from "@/features/teams/actions";
import { TEAM_MEMBER_STATUS_LABELS } from "@/features/teams/schemas";
import type { getTeamMembers } from "@/features/teams/queries";

type Member = Awaited<ReturnType<typeof getTeamMembers>>[number];

const initialState: TeamActionState = {};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  on_leave: "warning",
  archived: "secondary",
};

export function TeamMembersDialog({
  teamId,
  teamName,
  members,
  people,
  canManage,
  isAdmin,
}: {
  teamId: string;
  teamName: string;
  members: Member[];
  people: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const availablePeople = people.filter((p) => !members.some((m) => m.personId === p.id));
  const boundAdd = addTeamMember.bind(null, teamId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Users className="size-4" />
        Membres ({members.length})
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Membres de {teamName}</DialogTitle>
        </DialogHeader>

        {members.length === 0 ? (
          <EmptyState icon={UserRound} title="Aucun membre" description="Ajoutez des personnes à cette équipe." />
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => (
              <MemberRow key={member.teamMemberId} teamId={teamId} member={member} canRemove={isAdmin} />
            ))}
          </div>
        )}

        {canManage && (
          <form action={formAction} className="flex flex-col gap-4 border-t border-slate-100 pt-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="team-member-personId">Ajouter une personne</Label>
              <FormSelect id="team-member-personId" name="personId" required defaultValue="">
                <option value="" disabled>
                  Choisir une personne
                </option>
                {availablePeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ teamId, member, canRemove }: { teamId: string; member: Member; canRemove: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRemove() {
    startTransition(async () => {
      const res = await removeTeamMember(teamId, member.teamMemberId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium text-navy">
          {member.firstName} {member.lastName}
        </span>
        <Badge variant={STATUS_VARIANT[member.status] ?? "secondary"} className="text-[10px]">
          {TEAM_MEMBER_STATUS_LABELS[member.status] ?? member.status}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-danger">{error}</span>}
        {canRemove && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
                Retirer
              </Button>
            }
            title="Retirer ce membre de l'équipe ?"
            description={`${member.firstName} ${member.lastName} sera retiré(e) de cette équipe.`}
            confirmLabel="Retirer"
            variant="destructive"
            onConfirm={handleRemove}
          />
        )}
      </div>
    </div>
  );
}
