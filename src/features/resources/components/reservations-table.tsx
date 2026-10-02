"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { FormSelect } from "@/components/shared/form-select";
import { updateReservationStatus } from "@/features/resources/actions";
import type { ReservationEntry } from "@/features/resources/queries";
import { RESERVATION_STATUS_LABELS, RESOURCE_TYPE_LABELS } from "@/features/resources/schemas";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-slate-100 text-slate-500",
};

function fmt(date: Date) {
  return {
    d: new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date),
    t: new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date),
  };
}

export function ReservationsTable({ items, currentUserId, manage }: { items: ReservationEntry[]; currentUserId: string; manage: { room: boolean; equipment: boolean } }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold text-navy">
            <th className="px-3 py-2.5">Ressource</th>
            <th className="px-3 py-2.5">Créneau</th>
            <th className="px-3 py-2.5">Motif</th>
            <th className="px-3 py-2.5">Demandeur</th>
            <th className="px-3 py-2.5">Statut</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <Row key={r.id} reservation={r} canEdit={(r.resourceType === "room" ? manage.room : manage.equipment) || r.reservedByUserId === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ reservation: r, canEdit }: { reservation: ReservationEntry; canEdit: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const s = fmt(r.startsAt);
  const e = fmt(r.endsAt);

  function change(status: string) {
    setError(null);
    startTransition(async () => {
      const res = await updateReservationStatus(r.id, status);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
      <td className="px-3 py-3">
        <span className="block font-semibold text-navy">{r.resourceName}</span>
        <span className="text-xs text-slate-400">{RESOURCE_TYPE_LABELS[r.resourceType]}</span>
      </td>
      <td className="px-3 py-3 text-slate-600">
        {s.d}
        <br />
        <span className="text-xs text-slate-400">{s.t} - {e.d === s.d ? e.t : `${e.d} ${e.t}`}</span>
      </td>
      <td className="px-3 py-3 text-slate-600">{r.purpose ?? "—"}</td>
      <td className="px-3 py-3 text-slate-600">{r.requesterName ?? "—"}</td>
      <td className="px-3 py-3">
        {canEdit ? (
          <FormSelect value={r.status} disabled={pending} onChange={(ev) => change(ev.target.value)} className="h-8 w-36 text-xs" aria-label="Statut de la réservation">
            {Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </FormSelect>
        ) : (
          <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[r.status])}>{RESERVATION_STATUS_LABELS[r.status]}</span>
        )}
        {error && <p role="alert" className="text-xs text-danger">{error}</p>}
      </td>
    </tr>
  );
}
