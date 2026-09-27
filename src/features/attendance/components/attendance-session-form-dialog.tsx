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
import { createAttendanceSession, type AttendanceActionState } from "@/features/attendance/actions";

const initialState: AttendanceActionState = {};

export function AttendanceSessionFormDialog({
  events,
  services,
  defaultEventId,
}: {
  events: { id: string; title: string }[];
  services: { id: string; title: string }[];
  defaultEventId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: AttendanceActionState, formData: FormData) => {
    const result = await createAttendanceSession(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouvelle session
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle session de présence</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-title">Titre *</Label>
            <Input id="session-title" name="title" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-eventId">Événement (optionnel)</Label>
              <FormSelect id="session-eventId" name="eventId" defaultValue={defaultEventId ?? ""}>
                <option value="">—</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-serviceId">Service (optionnel)</Label>
              <FormSelect id="session-serviceId" name="serviceId" defaultValue="">
                <option value="">—</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <p className="text-xs text-slate-400">Rattachez la session à un événement ou un service (au moins un des deux).</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-startsAt">Début *</Label>
              <Input id="session-startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-endsAt">Fin (optionnel)</Label>
              <Input id="session-endsAt" name="endsAt" type="datetime-local" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-location">Lieu (optionnel)</Label>
            <Input id="session-location" name="location" />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
