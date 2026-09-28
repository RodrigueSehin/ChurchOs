import Link from "next/link";
import { Church, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MINISTRY_STATUS_LABELS, categoryStyle } from "@/features/ministries/schemas";
import { MinistryRowActions } from "@/features/ministries/components/ministry-row-actions";
import type { getMinistries } from "@/features/ministries/queries";

type MinistryRow = Awaited<ReturnType<typeof getMinistries>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary"> = {
  active: "success",
  inactive: "secondary",
  archived: "secondary",
};

function initialsOf(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function MinistriesTable({ rows, canDelete }: { rows: MinistryRow[]; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Nom du ministère</th>
            <th className="px-3 py-2.5 font-medium">Catégorie</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 font-medium">Membres</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const leaderName = row.leaderFirstName ? `${row.leaderFirstName} ${row.leaderLastName}` : null;
            const style = row.category ? categoryStyle(row.category) : null;
            const iconColor = style?.dot ?? row.color ?? "#94A3B8";
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/ministries/${row.id}`} className="flex items-center gap-3">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: iconColor }}
                    >
                      <Church className="size-4.5" />
                    </span>
                    <span>
                      <span className="block font-medium text-navy hover:underline">{row.name}</span>
                      {row.description && <span className="block text-xs text-slate-400">{row.description}</span>}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  {row.category ? <Badge className={style?.badge}>{row.category}</Badge> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3">
                  {leaderName ? (
                    <span className="flex items-center gap-2 text-slate-600">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">{initialsOf(row.leaderFirstName!, row.leaderLastName!)}</AvatarFallback>
                      </Avatar>
                      {leaderName}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-3.5" />
                    {row.memberCount}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{MINISTRY_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3">
                  <MinistryRowActions ministryId={row.id} ministryName={row.name} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
