import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { pastelStyleFor } from "@/lib/color-hash";
import { EVENT_STATUS_LABELS } from "@/features/events/schemas";
import { EventRowActions } from "@/features/events/components/event-row-actions";
import type { getEvents } from "@/features/events/queries";

type Row = Awaited<ReturnType<typeof getEvents>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger" | "default"> = {
  draft: "secondary",
  published: "success",
  cancelled: "danger",
  completed: "default",
  archived: "secondary",
};

function formatDate(value: Date) {
  const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(value);
  const month = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(value).replace(".", "").toUpperCase();
  return { day, month };
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function EventsTable({
  rows,
  categories,
  canUpdate,
  canDelete,
}: {
  rows: Row[];
  categories: { id: string; name: string }[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Événement</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Lieu</th>
            <th className="px-3 py-2.5 font-medium">Intervenant</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Inscriptions</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { day, month } = formatDate(row.startsAt);
            const style = pastelStyleFor(row.categoryName ?? row.title);
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-1 text-navy">
                    <span className="text-base font-bold leading-none">{day}</span>
                    <span className="mt-0.5 text-[10px] leading-none text-slate-500">{month}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Link href={`/events/${row.id}`} className="flex items-center gap-3">
                    {row.imageUrl ? (
                      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg">
                        <Image src={row.imageUrl} alt="" fill className="object-cover" />
                      </span>
                    ) : (
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: style.dot }}>
                        <CalendarDays className="size-4.5" />
                      </span>
                    )}
                    <span>
                      <span className="block font-medium text-navy hover:underline">{row.title}</span>
                      {row.description && <span className="block max-w-[220px] truncate text-xs text-slate-400">{row.description}</span>}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  {row.categoryName ? <Badge className={style.badge}>{row.categoryName}</Badge> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-3 text-slate-500">{row.location ?? "—"}</td>
                <td className="px-3 py-3">
                  {row.organizerName ? (
                    <span className="flex items-center gap-2 text-slate-600">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">{initialsOf(row.organizerName)}</AvatarFallback>
                      </Avatar>
                      {row.organizerName}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{EVENT_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">
                  {row.registrationEnabled ? (
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" />
                      {row.registrationCount}
                      {row.capacity ? ` / ${row.capacity}` : ""}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-3">
                  <EventRowActions event={row} categories={categories} canUpdate={canUpdate} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
