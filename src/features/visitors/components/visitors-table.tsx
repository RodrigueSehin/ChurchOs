import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VISITOR_STATUS_LABELS } from "@/features/visitors/schemas";
import { VisitorRowActions } from "@/features/visitors/components/visitor-row-actions";
import type { getVisitors } from "@/features/visitors/queries";

type VisitorRow = Awaited<ReturnType<typeof getVisitors>>["rows"][number];

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "secondary" | "danger"> = {
  new: "default",
  contacted: "secondary",
  follow_up: "warning",
  connected: "success",
  converted: "success",
  lost: "danger",
  archived: "secondary",
};

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function VisitorsTable({ rows, canConvert }: { rows: VisitorRow[]; canConvert: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="w-10 px-4 py-2.5">
              <Checkbox aria-label="Tout sélectionner" />
            </th>
            <th className="px-3 py-2.5 font-medium">Nom complet</th>
            <th className="px-3 py-2.5 font-medium">Téléphone</th>
            <th className="px-3 py-2.5 font-medium">Email</th>
            <th className="px-3 py-2.5 font-medium">Date de visite</th>
            <th className="px-3 py-2.5 font-medium">Événement / Culte</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = `${row.firstName} ${row.lastName}`;
            return (
              <tr key={row.visitorId} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Checkbox aria-label={`Sélectionner ${name}`} />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/visitors/${row.visitorId}`} className="flex items-center gap-3">
                    <Avatar>
                      {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
                      <AvatarFallback>{initialsOf(row.firstName, row.lastName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-navy hover:underline">{name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.phone ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{row.email ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{formatDate(row.firstVisitDate) ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{row.lastEventTitle ?? "—"}</td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>
                    {VISITOR_STATUS_LABELS[row.status] ?? row.status}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <VisitorRowActions visitorId={row.visitorId} name={name} status={row.status} canConvert={canConvert} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
