import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { CONFIDENTIALITY_LABELS, PASTORAL_STATUS_LABELS, PRIORITY_LABELS } from "@/features/pastoral/schemas";
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

const CONFIDENTIALITY_VARIANT: Record<string, "secondary" | "warning" | "danger"> = {
  normal: "secondary",
  pastoral: "warning",
  restricted: "danger",
};

export function PastoralTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Suivi</th>
            <th className="px-3 py-2.5 font-medium">Personne</th>
            <th className="px-3 py-2.5 font-medium">Priorité</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Confidentialité</th>
            <th className="px-3 py-2.5 font-medium">Échéance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/pastoral/${row.id}`} className="font-medium text-navy hover:underline">
                  {row.title}
                </Link>
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.personFirstName} {row.personLastName}
              </td>
              <td className="px-3 py-3 text-slate-500">{PRIORITY_LABELS[row.priority] ?? row.priority}</td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                  {PASTORAL_STATUS_LABELS[row.status] ?? row.status}
                </Badge>
              </td>
              <td className="px-3 py-3">
                <Badge variant={CONFIDENTIALITY_VARIANT[row.confidentiality] ?? "secondary"}>
                  {CONFIDENTIALITY_LABELS[row.confidentiality] ?? row.confidentiality}
                </Badge>
              </td>
              <td className="px-3 py-3 text-slate-500">{row.dueDate ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
