"use client";

import { useActionState, useState } from "react";
import { QrCode, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { EmptyState } from "@/components/shared/empty-state";
import { markAttendance, type AttendanceActionState } from "@/features/attendance/actions";
import { ATTENDANCE_STATUS_LABELS } from "@/features/attendance/schemas";
import type { getAttendanceRecords } from "@/features/attendance/queries";

type Record_ = Awaited<ReturnType<typeof getAttendanceRecords>>[number];

const initialState: AttendanceActionState = {};

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  present: "success",
  absent: "danger",
  excused: "secondary",
  late: "warning",
};

export function AttendanceRecordsDialog({
  sessionId,
  sessionTitle,
  records,
  people,
  canManage,
}: {
  sessionId: string;
  sessionTitle: string;
  records: Record_[];
  people: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const availablePeople = people.filter((p) => !records.some((r) => r.personId === p.id));
  const boundAction = markAttendance.bind(null, sessionId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Users className="size-4" />
        Présences ({records.length})
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Présences — {sessionTitle}</DialogTitle>
        </DialogHeader>

        {records.length === 0 ? (
          <EmptyState icon={Users} title="Aucune présence" description="Enregistrez manuellement une présence, ou attendez un scan QR." />
        ) : (
          <div className="flex flex-col gap-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium text-navy">
                  {r.firstName} {r.lastName}
                  {r.method === "qr" && <QrCode className="size-3.5 text-slate-400" />}
                </span>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{ATTENDANCE_STATUS_LABELS[r.status] ?? r.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <form action={formAction} className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <FormSelect name="personId" required defaultValue="">
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
            <div className="flex flex-1 flex-col gap-1.5">
              <FormSelect name="status" defaultValue="present">
                {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Ajout..." : "Enregistrer"}
            </Button>
          </form>
        )}
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
      </DialogContent>
    </Dialog>
  );
}
