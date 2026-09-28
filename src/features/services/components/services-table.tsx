import { CalendarClock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { pastelStyleFor } from "@/lib/color-hash";
import { SERVICE_STATUS_LABELS } from "@/features/services/schemas";
import { ServiceRowActions } from "@/features/services/components/service-row-actions";
import type { getServiceAssignments, getServiceTypes, getServicesList } from "@/features/services/queries";

type Row = Awaited<ReturnType<typeof getServicesList>>["rows"][number];
type ServiceType = Awaited<ReturnType<typeof getServiceTypes>>[number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  planned: "secondary",
  confirmed: "success",
  completed: "success",
  cancelled: "danger",
};

function formatWeekday(value: Date) {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatTimeRange(start: Date, end: Date | null) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const s = fmt.format(start).replace(":", "h");
  if (!end) return s;
  return `${s} - ${fmt.format(end).replace(":", "h")}`;
}

function initialsOf(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function ServicesTable({
  rows,
  assignmentsByService,
  types,
  workers,
  canManage,
  isAdmin,
}: {
  rows: Row[];
  assignmentsByService: Map<string, Awaited<ReturnType<typeof getServiceAssignments>>>;
  types: ServiceType[];
  workers: { id: string; name: string }[];
  canManage: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Nom du service</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Jour</th>
            <th className="px-3 py-2.5 font-medium">Heure</th>
            <th className="px-3 py-2.5 font-medium">Lieu</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const style = pastelStyleFor(row.serviceTypeName ?? row.title);
            const responsableName = row.responsable ? `${row.responsable.firstName} ${row.responsable.lastName}` : null;
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: style.dot }}>
                      <CalendarClock className="size-4.5" />
                    </span>
                    <span className="font-medium text-navy">{row.title}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {row.serviceTypeName ? <Badge className={style.badge}>{row.serviceTypeName}</Badge> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 text-slate-500">{formatWeekday(row.startsAt)}</td>
                <td className="px-3 py-3 text-slate-500">{formatTimeRange(row.startsAt, row.endsAt)}</td>
                <td className="px-3 py-3 text-slate-500">{row.location ?? "—"}</td>
                <td className="px-3 py-3">
                  {responsableName ? (
                    <span className="flex items-center gap-2 text-slate-600">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">{initialsOf(row.responsable!.firstName, row.responsable!.lastName)}</AvatarFallback>
                      </Avatar>
                      {responsableName}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{SERVICE_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3">
                  <ServiceRowActions
                    service={row}
                    assignments={assignmentsByService.get(row.id) ?? []}
                    types={types}
                    workers={workers}
                    canManage={canManage}
                    isAdmin={isAdmin}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
