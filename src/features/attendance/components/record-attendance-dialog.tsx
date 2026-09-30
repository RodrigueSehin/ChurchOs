"use client";

import { useActionState, useState } from "react";
import { Plus, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { EmptyState } from "@/components/shared/empty-state";
import { recordAttendance, type AttendanceActionState } from "@/features/attendance/actions";
import { ATTENDANCE_STATUS_LABELS } from "@/features/attendance/schemas";
import { AttendanceSessionFormDialog } from "@/features/attendance/components/attendance-session-form-dialog";

const initialState: AttendanceActionState = {};

export function RecordAttendanceDialog({
  sessions,
  people,
  events,
  services,
  label = "Enregistrer une présence",
  variant = "default",
}: {
  sessions: { id: string; title: string; startsAt: Date }[];
  people: { id: string; name: string }[];
  events: { id: string; title: string }[];
  services: { id: string; title: string }[];
  label?: string;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: AttendanceActionState, formData: FormData) => {
    const result = await recordAttendance(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        <UserCheck className="size-4" />
        {label}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enregistrer une présence</DialogTitle>
        </DialogHeader>

        {sessions.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="Aucune session"
            description="Créez d'abord une session de présence rattachée à un événement ou un service."
            action={<AttendanceSessionFormDialog events={events} services={services} />}
          />
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <FormSelect name="sessionId" required defaultValue="">
                <option value="" disabled>
                  Choisir une session
                </option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} — {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(s.startsAt)}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <FormSelect name="personId" required defaultValue="">
                <option value="" disabled>
                  Choisir une personne
                </option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <FormSelect name="status" defaultValue="present">
                {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                <Plus className="size-4" />
                {pending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
