import Link from "next/link";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MINISTRY_STATUS_LABELS } from "@/features/ministries/schemas";
import type { getMinistries } from "@/features/ministries/queries";

type MinistryRow = Awaited<ReturnType<typeof getMinistries>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary"> = {
  active: "success",
  inactive: "secondary",
  archived: "secondary",
};

export function MinistriesTable({ rows }: { rows: MinistryRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Ministère</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Membres</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/ministries/${row.id}`} className="flex items-center gap-2 font-medium text-navy hover:underline">
                  {row.color && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />}
                  {row.name}
                </Link>
                {row.code && <p className="mt-0.5 text-xs text-slate-400">{row.code}</p>}
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.leaderFirstName ? `${row.leaderFirstName} ${row.leaderLastName}` : "—"}
              </td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{MINISTRY_STATUS_LABELS[row.status] ?? row.status}</Badge>
              </td>
              <td className="px-3 py-3 text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {row.memberCount}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
