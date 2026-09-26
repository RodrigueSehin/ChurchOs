import { Badge } from "@/components/ui/badge";
import { VISIT_STATUS_LABELS, VISIT_TYPE_LABELS } from "@/features/visits/schemas";
import { VisitEditDialog } from "@/features/visits/components/visit-edit-dialog";
import type { getVisits } from "@/features/visits/queries";

type Row = Awaited<ReturnType<typeof getVisits>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  new: "secondary",
  in_progress: "default",
  waiting: "warning",
  completed: "success",
  cancelled: "secondary",
  archived: "secondary",
};

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function VisitsTable({
  rows,
  people,
  assignableUsers,
  canUpdate,
}: {
  rows: Row[];
  people: { id: string; name: string }[];
  assignableUsers: { id: string; name: string }[];
  canUpdate: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Personne</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Lieu</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            {canUpdate && <th className="px-3 py-2.5 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3 font-medium text-navy">
                {row.personFirstName} {row.personLastName}
              </td>
              <td className="px-3 py-3 text-slate-500">{VISIT_TYPE_LABELS[row.visitType] ?? row.visitType}</td>
              <td className="px-3 py-3 text-slate-500">{formatDateTime(row.scheduledAt)}</td>
              <td className="px-3 py-3 text-slate-500">{row.location ?? "—"}</td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{VISIT_STATUS_LABELS[row.status] ?? row.status}</Badge>
              </td>
              {canUpdate && (
                <td className="px-3 py-3 text-right">
                  <VisitEditDialog visit={row} people={people} assignableUsers={assignableUsers} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
