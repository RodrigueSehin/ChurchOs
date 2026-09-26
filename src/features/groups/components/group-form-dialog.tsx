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
import type { GroupActionState } from "@/features/groups/actions";
import { GROUP_TYPE_LABELS, SERVICE_DAY_LABELS } from "@/features/groups/schemas";
import type { groups } from "@/lib/db/schema";

const initialState: GroupActionState = {};

export function GroupFormDialog({
  action,
  people,
  group,
  trigger,
}: {
  action: (prev: GroupActionState, formData: FormData) => Promise<GroupActionState>;
  people: { id: string; name: string }[];
  group?: typeof groups.$inferSelect;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: GroupActionState, formData: FormData) => {
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
          Nouveau groupe
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group ? `Modifier ${group.name}` : "Nouveau groupe"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-name">Nom *</Label>
              <Input id="group-name" name="name" defaultValue={group?.name ?? ""} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-type">Type</Label>
              <FormSelect id="group-type" name="type" defaultValue={group?.type ?? "custom"}>
                {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-code">Code (optionnel)</Label>
            <Input id="group-code" name="code" defaultValue={group?.code ?? ""} placeholder="Ex : GR-01" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-description">Description (optionnel)</Label>
            <Input id="group-description" name="description" defaultValue={group?.description ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group-leader">Responsable (optionnel)</Label>
            <FormSelect id="group-leader" name="leaderPersonId" defaultValue={group?.leaderPersonId ?? ""}>
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-meetingDay">Jour de rencontre (optionnel)</Label>
              <FormSelect id="group-meetingDay" name="meetingDay" defaultValue={group?.meetingDay?.toString() ?? ""}>
                <option value="">—</option>
                {Object.entries(SERVICE_DAY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-meetingTime">Heure (optionnel)</Label>
              <Input id="group-meetingTime" name="meetingTime" type="time" defaultValue={group?.meetingTime ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-meetingLocation">Lieu (optionnel)</Label>
              <Input id="group-meetingLocation" name="meetingLocation" defaultValue={group?.meetingLocation ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="group-capacity">Capacité (optionnel)</Label>
              <Input id="group-capacity" name="capacity" type="number" min={1} defaultValue={group?.capacity ?? ""} />
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : group ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
