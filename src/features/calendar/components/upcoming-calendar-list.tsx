import Link from "next/link";
import { Clock } from "lucide-react";

import { pastelStyleFor } from "@/lib/color-hash";
import { CALENDAR_SOURCE_LABELS } from "@/features/calendar/schemas";
import type { CalendarEntry } from "@/features/calendar/queries";

function formatTimeRange(start: Date, end: Date | null) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const s = fmt.format(start).replace(":", "h");
  if (!end) return s;
  return `${s} - ${fmt.format(end).replace(":", "h")}`;
}

export function UpcomingCalendarList({ entries }: { entries: CalendarEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucun événement à venir.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {entries.map((entry) => {
        const color = entry.color ?? pastelStyleFor(entry.category ?? CALENDAR_SOURCE_LABELS[entry.source] ?? entry.source).dot;
        const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(entry.startsAt).slice(0, 3).toUpperCase();
        const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(entry.startsAt);
        const month = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(entry.startsAt).toUpperCase();

        const content = (
          <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
            <div className="flex w-12 shrink-0 flex-col items-center rounded-lg py-1.5 text-white" style={{ backgroundColor: color }}>
              <span className="text-[10px] font-medium leading-none">{weekday}</span>
              <span className="mt-0.5 text-base font-bold leading-none">{day}</span>
              <span className="mt-0.5 text-[9px] leading-none text-white/70">{month}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy">{entry.title}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Clock className="size-3" />
                {formatTimeRange(entry.startsAt, entry.endsAt)}
              </p>
            </div>
          </div>
        );

        return entry.href ? (
          <Link key={entry.id} href={entry.href} className="hover:opacity-80">
            {content}
          </Link>
        ) : (
          <div key={entry.id}>{content}</div>
        );
      })}
    </div>
  );
}
