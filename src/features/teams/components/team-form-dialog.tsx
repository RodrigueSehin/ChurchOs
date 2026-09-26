"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import type { TeamActionState } from "@/features/teams/actions";
import type { getTeams } from "@/features/teams/queries";

const initialState: TeamActionState = {};

type Team = Awaited<ReturnType<typeof getTeams>>[number];

export function TeamFormDialog({
  action,
  people,
  ministries,
  team,
  trigger,
}: {
  action: (prev: TeamActionState, formData: FormData) => Promise<TeamActionState>;
  people: { id: string; name: string }[];
  ministries: { id: string; name: string }[];
  team?: Team;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: TeamActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouvelle équipe
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? `Modifier ${team.name}` : "Nouvelle équipe"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name">Nom *</Label>
            <Input id="team-name" name="name" defaultValue={team?.name ?? ""} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-description">Description (optionnel)</Label>
            <Input id="team-description" name="description" defaultValue={team?.description ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="team-ministryId">Ministère (optionnel)</Label>
              <FormSelect id="team-ministryId" name="ministryId" defaultValue={team?.ministryId ?? ""}>
                <option value="">—</option>
                {ministries.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="team-leaderPersonId">Responsable (optionnel)</Label>
              <FormSelect id="team-leaderPersonId" name="leaderPersonId" defaultValue={team?.leaderPersonId ?? ""}>
                <option value="">—</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : team ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
