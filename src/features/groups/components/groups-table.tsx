import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GROUP_TYPE_LABELS, SERVICE_DAY_LABELS } from "@/features/groups/schemas";
import { GroupRowActions } from "@/features/groups/components/group-row-actions";
import type { getGroups } from "@/features/groups/queries";

type GroupRow = Awaited<ReturnType<typeof getGroups>>["rows"][number];

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function GroupsTable({ rows, canDelete }: { rows: GroupRow[]; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="w-10 px-4 py-2.5">
              <Checkbox aria-label="Tout sélectionner" />
            </th>
            <th className="px-3 py-2.5 font-medium">Nom du groupe</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 font-medium">Membres</th>
            <th className="px-3 py-2.5 font-medium">Jour de rencontre</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const leaderName = row.leaderFirstName ? `${row.leaderFirstName} ${row.leaderLastName}` : null;
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Checkbox aria-label={`Sélectionner ${row.name}`} />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/groups/${row.id}`} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initialsOf(row.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-navy hover:underline">{row.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <Badge variant="secondary">{GROUP_TYPE_LABELS[row.type] ?? row.type}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{leaderName ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{row.memberCount}</td>
                <td className="px-3 py-3 text-slate-500">
                  {row.meetingDay != null ? SERVICE_DAY_LABELS[String(row.meetingDay)] : "—"}
                  {row.meetingTime ? ` ${row.meetingTime.slice(0, 5)}` : ""}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={row.isActive ? "success" : "secondary"}>{row.isActive ? "Actif" : "Inactif"}</Badge>
                </td>
                <td className="px-3 py-3">
                  <GroupRowActions groupId={row.id} groupName={row.name} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
