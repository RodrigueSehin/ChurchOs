import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PASTORAL_STATUS_LABELS, PRIORITY_LABELS } from "@/features/pastoral/schemas";
import { PastoralRowActions } from "@/features/pastoral/components/pastoral-row-actions";
import type { getPastoralFollowups } from "@/features/pastoral/queries";

type Row = Awaited<ReturnType<typeof getPastoralFollowups>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  new: "secondary",
  in_progress: "default",
  waiting: "warning",
  completed: "success",
  cancelled: "secondary",
  archived: "secondary",
};

const PRIORITY_VARIANT: Record<string, "secondary" | "default" | "warning" | "danger"> = {
  low: "secondary",
  normal: "default",
  high: "warning",
  urgent: "danger",
};

function formatDate(value: string | Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function PastoralTable({ rows, canDelete }: { rows: Row[]; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="w-10 px-4 py-2.5">
              <Checkbox aria-label="Tout sélectionner" />
            </th>
            <th className="px-3 py-2.5 font-medium">Membre</th>
            <th className="px-3 py-2.5 font-medium">Priorité</th>
            <th className="px-3 py-2.5 font-medium">Motif / Sujet</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Dernière activité</th>
            <th className="px-3 py-2.5 font-medium">Prochaine action</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Checkbox aria-label={`Sélectionner ${row.title}`} />
              </td>
              <td className="px-3 py-3">
                <Link href={`/pastoral/${row.id}`} className="font-medium text-navy hover:underline">
                  {row.personFirstName} {row.personLastName}
                </Link>
              </td>
              <td className="px-3 py-3">
                <Badge variant={PRIORITY_VARIANT[row.priority] ?? "secondary"}>{PRIORITY_LABELS[row.priority] ?? row.priority}</Badge>
              </td>
              <td className="px-3 py-3 text-slate-500">{row.title}</td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                  {PASTORAL_STATUS_LABELS[row.status] ?? row.status}
                </Badge>
              </td>
              <td className="px-3 py-3 text-slate-500">{formatDate(row.updatedAt) ?? "—"}</td>
              <td className="px-3 py-3 text-slate-500">{formatDate(row.dueDate) ?? "—"}</td>
              <td className="px-3 py-3 text-slate-500">{row.assignedToEmail ?? "—"}</td>
              <td className="px-3 py-3">
                <PastoralRowActions id={row.id} title={row.title} canDelete={canDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
