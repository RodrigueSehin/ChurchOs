import Link from "next/link";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { GROUP_TYPE_LABELS, SERVICE_DAY_LABELS } from "@/features/groups/schemas";
import type { getGroups } from "@/features/groups/queries";

type GroupRow = Awaited<ReturnType<typeof getGroups>>["rows"][number];

export function GroupsTable({ rows }: { rows: GroupRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Groupe</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 font-medium">Rencontre</th>
            <th className="px-3 py-2.5 font-medium">Membres</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/groups/${row.id}`} className="font-medium text-navy hover:underline">
                  {row.name}
                </Link>
                <div className="mt-0.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {GROUP_TYPE_LABELS[row.type] ?? row.type}
                  </Badge>
                </div>
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.leaderFirstName ? `${row.leaderFirstName} ${row.leaderLastName}` : "—"}
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.meetingDay != null ? SERVICE_DAY_LABELS[String(row.meetingDay)] : "—"}
                {row.meetingTime ? ` · ${row.meetingTime.slice(0, 5)}` : ""}
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
