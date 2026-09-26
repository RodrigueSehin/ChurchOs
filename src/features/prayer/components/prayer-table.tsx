import Link from "next/link";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { PRAYER_STATUS_LABELS, PRIORITY_LABELS } from "@/features/prayer/schemas";
import type { getPrayerRequests } from "@/features/prayer/queries";

type Row = Awaited<ReturnType<typeof getPrayerRequests>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  open: "secondary",
  in_progress: "default",
  answered: "success",
  closed: "secondary",
  archived: "secondary",
};

export function PrayerTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Sujet</th>
            <th className="px-3 py-2.5 font-medium">Personne</th>
            <th className="px-3 py-2.5 font-medium">Priorité</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/prayer/${row.id}`} className="flex items-center gap-1.5 font-medium text-navy hover:underline">
                  {row.isConfidential && <Lock className="size-3.5 shrink-0 text-slate-400" />}
                  {row.title}
                </Link>
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.personFirstName ? `${row.personFirstName} ${row.personLastName}` : "—"}
              </td>
              <td className="px-3 py-3 text-slate-500">{PRIORITY_LABELS[row.priority] ?? row.priority}</td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{PRAYER_STATUS_LABELS[row.status] ?? row.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
