import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

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
  const now = new Date().getTime();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="w-10 px-4 py-2.5">
              <Checkbox aria-label="Tout sélectionner" />
            </th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Personne</th>
            <th className="px-3 py-2.5 font-medium">Type de visite</th>
            <th className="px-3 py-2.5 font-medium">Lieu</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            {canUpdate && <th className="w-12 px-3 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = `${row.personFirstName} ${row.personLastName}`;
            const isOverdue =
              row.scheduledAt &&
              new Date(row.scheduledAt).getTime() < now &&
              !["completed", "cancelled", "archived"].includes(row.status);
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Checkbox aria-label={`Sélectionner ${name}`} />
                </td>
                <td className="px-3 py-3 text-slate-500">{formatDateTime(row.scheduledAt)}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2 font-medium text-navy">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[11px]">{initialsOf(row.personFirstName, row.personLastName)}</AvatarFallback>
                    </Avatar>
                    {name}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge variant="secondary">{VISIT_TYPE_LABELS[row.visitType] ?? row.visitType}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.location ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{row.assignedToEmail ?? "—"}</td>
                <td className="px-3 py-3">
                  {isOverdue ? (
                    <Badge variant="danger">En retard</Badge>
                  ) : (
                    <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{VISIT_STATUS_LABELS[row.status] ?? row.status}</Badge>
                  )}
                </td>
                {canUpdate && (
                  <td className="px-3 py-3 text-right">
                    <VisitEditDialog visit={row} people={people} assignableUsers={assignableUsers} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
