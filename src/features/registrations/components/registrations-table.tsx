"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { FormSelect } from "@/components/shared/form-select";
import { updateRegistrationStatus } from "@/features/registrations/actions";
import { REGISTRATION_STATUS_LABELS } from "@/features/registrations/schemas";
import { RegistrationQrDialog } from "@/features/registrations/components/registration-qr-dialog";
import type { getRegistrations } from "@/features/registrations/queries";

type Row = Awaited<ReturnType<typeof getRegistrations>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  waitlisted: "secondary",
  cancelled: "danger",
  attended: "success",
  no_show: "danger",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function RegistrationsTable({ rows, canUpdate }: { rows: Row[]; canUpdate: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Participant</th>
            <th className="px-3 py-2.5 font-medium">Événement</th>
            <th className="px-3 py-2.5 font-medium">Inscrit le</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row.id} row={row} canUpdate={canUpdate} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row, canUpdate }: { row: Row; canUpdate: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const name = row.personId ? `${row.personFirstName} ${row.personLastName}` : row.guestName ?? "—";

  function handleStatusChange(status: string) {
    startTransition(async () => {
      const res = await updateRegistrationStatus(row.id, status);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
      <td className="px-4 py-3 font-medium text-navy">
        {name}
        {!row.personId && (
          <Badge variant="secondary" className="ml-2 text-[10px]">
            Invité
          </Badge>
        )}
      </td>
      <td className="px-3 py-3 text-slate-500">{row.eventTitle}</td>
      <td className="px-3 py-3 text-slate-500">{formatDate(row.registeredAt)}</td>
      <td className="px-3 py-3">
        {canUpdate ? (
          <FormSelect value={row.status} disabled={isPending} onChange={(e) => handleStatusChange(e.target.value)} className="w-auto sm:max-w-[160px]">
            {Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FormSelect>
        ) : (
          <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{REGISTRATION_STATUS_LABELS[row.status] ?? row.status}</Badge>
        )}
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </td>
      <td className="px-3 py-3 text-right">
        {row.qrToken && <RegistrationQrDialog registrationId={row.id} name={name} />}
      </td>
    </tr>
  );
}
