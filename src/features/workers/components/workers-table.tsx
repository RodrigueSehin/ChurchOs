import { Badge } from "@/components/ui/badge";
import { WORKER_STATUS_LABELS } from "@/features/workers/schemas";
import { WorkerFormDialog } from "@/features/workers/components/worker-form-dialog";
import { ArchiveWorkerButton } from "@/features/workers/components/archive-worker-button";
import { updateWorker } from "@/features/workers/actions";
import type { getWorkers } from "@/features/workers/queries";

type Row = Awaited<ReturnType<typeof getWorkers>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  on_leave: "warning",
  archived: "secondary",
};

export function WorkersTable({ rows, people, canUpdate }: { rows: Row[]; people: { id: string; name: string }[]; canUpdate: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Ouvrier</th>
            <th className="px-3 py-2.5 font-medium">Numéro</th>
            <th className="px-3 py-2.5 font-medium">Compétences</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            {canUpdate && <th className="px-3 py-2.5 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3 font-medium text-navy">
                {row.firstName} {row.lastName}
              </td>
              <td className="px-3 py-3 text-slate-500">{row.workerNumber ?? "—"}</td>
              <td className="px-3 py-3 text-slate-500">
                {Array.isArray(row.skills) && row.skills.length > 0 ? row.skills.join(", ") : "—"}
              </td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{WORKER_STATUS_LABELS[row.status] ?? row.status}</Badge>
              </td>
              {canUpdate && (
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <WorkerFormDialog
                      action={updateWorker.bind(null, row.id)}
                      people={people}
                      worker={row}
                      trigger={
                        <button type="button" className="text-sm font-medium text-navy underline-offset-2 hover:underline">
                          Modifier
                        </button>
                      }
                    />
                    {row.status !== "archived" && <ArchiveWorkerButton workerId={row.id} workerName={`${row.firstName} ${row.lastName}`} />}
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
