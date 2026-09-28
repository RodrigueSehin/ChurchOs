import Link from "next/link";
import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PRAYER_STATUS_LABELS } from "@/features/prayer/schemas";
import { PrayerRowActions } from "@/features/prayer/components/prayer-row-actions";
import type { getPrayerRequests } from "@/features/prayer/queries";

type Row = Awaited<ReturnType<typeof getPrayerRequests>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  open: "secondary",
  in_progress: "default",
  answered: "success",
  closed: "secondary",
  archived: "secondary",
};

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function PrayerTable({ rows, canDelete }: { rows: Row[]; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="w-10 px-4 py-2.5">
              <Checkbox aria-label="Tout sélectionner" />
            </th>
            <th className="px-3 py-2.5 font-medium">Sujet de prière</th>
            <th className="px-3 py-2.5 font-medium">Catégorie</th>
            <th className="px-3 py-2.5 font-medium">Demandé par</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const personName = row.personFirstName ? `${row.personFirstName} ${row.personLastName}` : null;
            const isUrgent = row.priority === "urgent" && row.status !== "answered" && row.status !== "closed" && row.status !== "archived";
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Checkbox aria-label={`Sélectionner ${row.title}`} />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/prayer/${row.id}`} className="flex items-center gap-1.5 font-medium text-navy hover:underline">
                    {row.isConfidential && <Lock className="size-3.5 shrink-0 text-slate-400" />}
                    {row.title}
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.category ? <Badge variant="secondary">{row.category}</Badge> : "—"}</td>
                <td className="px-3 py-3">
                  {personName ? (
                    <span className="flex items-center gap-2 text-slate-500">
                      <Avatar className="size-6">
                        {row.personPhotoUrl && <AvatarImage src={row.personPhotoUrl} alt="" />}
                        <AvatarFallback className="text-[10px]">{initialsOf(row.personFirstName!, row.personLastName!)}</AvatarFallback>
                      </Avatar>
                      {personName}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3 text-slate-500">{formatDate(row.createdAt)}</td>
                <td className="px-3 py-3">
                  {isUrgent ? (
                    <Badge variant="danger">Urgent</Badge>
                  ) : (
                    <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{PRAYER_STATUS_LABELS[row.status] ?? row.status}</Badge>
                  )}
                </td>
                <td className="px-3 py-3">
                  <PrayerRowActions id={row.id} title={row.title} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
