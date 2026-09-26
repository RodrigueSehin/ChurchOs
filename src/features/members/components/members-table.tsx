import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MEMBER_STATUS_LABELS } from "@/features/members/schemas";
import type { getMembers } from "@/features/members/queries";

type MemberRow = Awaited<ReturnType<typeof getMembers>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "danger"> = {
  active: "success",
  inactive: "secondary",
  transferred: "warning",
  deceased: "secondary",
  archived: "secondary",
};

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function MembersTable({ rows }: { rows: MemberRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Membre</th>
            <th className="px-3 py-2.5 font-medium">Contact</th>
            <th className="px-3 py-2.5 font-medium">Campus</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Adhésion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = row.preferredName || `${row.firstName} ${row.lastName}`;
            const status = STATUS_VARIANT[row.status] ?? "secondary";
            return (
              <tr key={row.memberId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Link href={`/members/${row.memberId}`} className="flex items-center gap-3">
                    <Avatar>
                      {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
                      <AvatarFallback>{initialsOf(row.firstName, row.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-navy hover:underline">{name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-500">
                  <div className="flex flex-col">
                    {row.email && <span className="truncate">{row.email}</span>}
                    {row.phone && <span className="text-xs">{row.phone}</span>}
                    {!row.email && !row.phone && "—"}
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.campusName ?? "—"}</td>
                <td className="px-3 py-3">
                  <Badge variant={status}>{MEMBER_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.membershipDate ?? "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
