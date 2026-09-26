import { Badge } from "@/components/ui/badge";
import { PLANNING_STATUS_LABELS } from "@/features/planning/schemas";
import { PlanningFormDialog } from "@/features/planning/components/planning-form-dialog";
import { DeletePlanningButton } from "@/features/planning/components/delete-planning-button";
import { updatePlanningSlot } from "@/features/planning/actions";
import type { getPlanningSlots } from "@/features/planning/queries";

type Row = Awaited<ReturnType<typeof getPlanningSlots>>[number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  assigned: "secondary",
  confirmed: "success",
  declined: "danger",
  completed: "success",
  cancelled: "secondary",
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function PlanningTable({
  rows,
  workers,
  canUpdate,
  isAdmin,
}: {
  rows: Row[];
  workers: { id: string; name: string }[];
  canUpdate: boolean;
  isAdmin: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Créneau</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Ouvrier</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            {canUpdate && <th className="px-3 py-2.5 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <p className="font-medium text-navy">{row.title}</p>
                {row.category && <p className="text-xs text-slate-400">{row.category}</p>}
              </td>
              <td className="px-3 py-3 text-slate-500">{formatDateTime(row.startsAt)}</td>
              <td className="px-3 py-3 text-slate-500">
                {row.workerFirstName ? `${row.workerFirstName} ${row.workerLastName}` : "—"}
              </td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{PLANNING_STATUS_LABELS[row.status] ?? row.status}</Badge>
              </td>
              {canUpdate && (
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <PlanningFormDialog
                      action={updatePlanningSlot.bind(null, row.id)}
                      workers={workers}
                      slot={row}
                      trigger={
                        <button type="button" className="text-sm font-medium text-navy underline-offset-2 hover:underline">
                          Modifier
                        </button>
                      }
                    />
                    {isAdmin && <DeletePlanningButton slotId={row.id} slotTitle={row.title} />}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
