"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/shared/empty-state";
import { createReservation, updateReservationStatus, type ResourceActionState } from "@/features/resources/actions";
import { RESERVATION_STATUS_LABELS } from "@/features/resources/schemas";
import type { getResourceReservations } from "@/features/resources/queries";

type Reservation = Awaited<ReturnType<typeof getResourceReservations>>[number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "danger",
  completed: "secondary",
};

const initialState: ResourceActionState = {};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ReservationPanel({
  resourceId,
  reservations,
  currentUserId,
  canManage,
  canReserve,
}: {
  resourceId: string;
  reservations: Reservation[];
  currentUserId: string;
  canManage: boolean;
  canReserve: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-navy">Réservations ({reservations.length})</p>
        {canReserve && (
          <Button type="button" size="sm" onClick={() => setOpen(true)}>
            <CalendarPlus className="size-4" />
            Réserver
          </Button>
        )}
      </div>

      {reservations.length === 0 ? (
        <EmptyState title="Aucune réservation" description="Cette ressource n'a pas encore été réservée." />
      ) : (
        <div className="flex flex-col gap-2">
          {reservations.map((reservation) => (
            <ReservationRow
              key={reservation.id}
              reservation={reservation}
              canEdit={canManage || reservation.reservedByUserId === currentUserId}
            />
          ))}
        </div>
      )}

      <ReserveDialog resourceId={resourceId} open={open} onOpenChange={setOpen} />
    </div>
  );
}

function ReservationRow({ reservation, canEdit }: { reservation: Reservation; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const res = await updateReservationStatus(reservation.id, status);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="truncate text-navy">
          {formatDateTime(reservation.startsAt)} → {formatDateTime(reservation.endsAt)}
        </p>
        <p className="truncate text-xs text-slate-400">
          {reservation.requesterName ?? "—"}
          {reservation.purpose ? ` · ${reservation.purpose}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {error && <span className="text-xs text-danger">{error}</span>}
        {canEdit ? (
          <FormSelect
            value={reservation.status}
            disabled={isPending}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-8 w-auto text-xs"
          >
            {Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        ) : (
          <Badge variant={STATUS_VARIANT[reservation.status] ?? "secondary"}>
            {RESERVATION_STATUS_LABELS[reservation.status] ?? reservation.status}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ReserveDialog({
  resourceId,
  open,
  onOpenChange,
}: {
  resourceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const boundAction = createReservation.bind(null, resourceId);
  const [state, formAction, pending] = useActionState(async (prev: ResourceActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (result.success) {
      onOpenChange(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réserver cette ressource</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-startsAt">Début *</Label>
              <Input id="reservation-startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reservation-endsAt">Fin *</Label>
              <Input id="reservation-endsAt" name="endsAt" type="datetime-local" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reservation-purpose">Motif (optionnel)</Label>
            <Input id="reservation-purpose" name="purpose" placeholder="Ex : Réunion d'équipe" />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Réservation..." : "Réserver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
