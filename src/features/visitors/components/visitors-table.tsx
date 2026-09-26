import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { VISITOR_STATUS_LABELS } from "@/features/visitors/schemas";
import type { getVisitors } from "@/features/visitors/queries";

type VisitorRow = Awaited<ReturnType<typeof getVisitors>>["rows"][number];

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "secondary" | "danger"> = {
  new: "secondary",
  contacted: "default",
  follow_up: "warning",
  connected: "success",
  converted: "success",
  lost: "danger",
  archived: "secondary",
};

export function VisitorsTable({ rows }: { rows: VisitorRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Visiteur</th>
            <th className="px-3 py-2.5 font-medium">Contact</th>
            <th className="px-3 py-2.5 font-medium">1ère visite</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Relance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.visitorId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/visitors/${row.visitorId}`} className="font-medium text-navy hover:underline">
                  {row.firstName} {row.lastName}
                </Link>
              </td>
              <td className="px-3 py-3 text-slate-500">
                <div className="flex flex-col">
                  {row.email && <span className="truncate">{row.email}</span>}
                  {row.phone && <span className="text-xs">{row.phone}</span>}
                  {!row.email && !row.phone && "—"}
                </div>
              </td>
              <td className="px-3 py-3 text-slate-500">{row.firstVisitDate ?? "—"}</td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                  {VISITOR_STATUS_LABELS[row.status] ?? row.status}
                </Badge>
              </td>
              <td className="px-3 py-3 text-slate-500">{row.followUpDate ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
