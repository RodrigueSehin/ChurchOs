import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GENDER_LABELS, MEMBER_STATUS_LABELS } from "@/features/members/schemas";
import { MemberRowActions } from "@/features/members/components/member-row-actions";
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

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function ageOf(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

export function MembersTable({ rows, canUpdate, canDelete }: { rows: MemberRow[]; canUpdate: boolean; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="w-10 px-4 py-2.5">
              <Checkbox aria-label="Tout sélectionner" />
            </th>
            <th className="px-3 py-2.5 font-medium">Nom complet</th>
            <th className="px-3 py-2.5 font-medium">Âge</th>
            <th className="px-3 py-2.5 font-medium">Genre</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Ministère / Groupe</th>
            <th className="px-3 py-2.5 font-medium">Date d&apos;adhésion</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = row.preferredName || `${row.firstName} ${row.lastName}`;
            const status = STATUS_VARIANT[row.status] ?? "secondary";
            const age = ageOf(row.birthDate);
            return (
              <tr key={row.memberId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Checkbox aria-label={`Sélectionner ${name}`} />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/members/${row.memberId}`} className="flex items-center gap-3">
                    <Avatar>
                      {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
                      <AvatarFallback>{initialsOf(row.firstName, row.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-navy hover:underline">{name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-500">{age ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{GENDER_LABELS[row.gender] ?? "—"}</td>
                <td className="px-3 py-3">
                  <Badge variant={status}>{MEMBER_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.ministryName ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{formatDate(row.membershipDate) ?? "—"}</td>
                <td className="px-3 py-3">
                  <MemberRowActions memberId={row.memberId} name={name} canUpdate={canUpdate} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
