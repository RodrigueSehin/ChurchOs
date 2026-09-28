import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { pastelStyleFor } from "@/lib/color-hash";
import { WORKER_STATUS_LABELS } from "@/features/workers/schemas";
import { WorkerRowActions } from "@/features/workers/components/worker-row-actions";
import type { getWorkers } from "@/features/workers/queries";

type Row = Awaited<ReturnType<typeof getWorkers>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning"> = {
  active: "success",
  inactive: "secondary",
  on_leave: "warning",
  archived: "secondary",
};

function initialsOf(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}

export function WorkersTable({ rows, people, canUpdate }: { rows: Row[]; people: { id: string; name: string }[]; canUpdate: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Nom et prénoms</th>
            <th className="px-3 py-2.5 font-medium">Équipe / Ministère</th>
            <th className="px-3 py-2.5 font-medium">Rôle / Fonction</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Date d&apos;engagement</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const style = row.affiliation ? pastelStyleFor(row.affiliation.name) : null;
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
                      <AvatarFallback className="text-[11px]">{initialsOf(row.firstName, row.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-navy">
                      {row.firstName} {row.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {row.affiliation ? <Badge className={style?.badge}>{row.affiliation.name}</Badge> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 text-slate-500">{row.affiliation?.role ?? "—"}</td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{WORKER_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
                <td className="px-3 py-3">
                  <WorkerRowActions worker={row} people={people} canUpdate={canUpdate} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
