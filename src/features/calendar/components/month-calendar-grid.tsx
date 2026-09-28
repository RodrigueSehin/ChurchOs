import Link from "next/link";

import { cn } from "@/lib/utils";
import { pastelStyleFor } from "@/lib/color-hash";
import { CALENDAR_SOURCE_LABELS } from "@/features/calendar/schemas";
import { dayKey } from "@/features/calendar/lib/month";
import type { CalendarEntry } from "@/features/calendar/queries";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_VISIBLE_PER_DAY = 3;

function entryColor(entry: CalendarEntry): string {
  return entry.color ?? pastelStyleFor(entry.category ?? CALENDAR_SOURCE_LABELS[entry.source] ?? entry.source).dot;
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(value).replace(":", "h");
}

export function MonthCalendarGrid({
  days,
  currentMonth,
  entriesByDay,
  today,
}: {
  days: Date[];
  currentMonth: number;
  entriesByDay: Map<string, CalendarEntry[]>;
  today: Date;
}) {
  const todayKey = dayKey(today);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-xs font-medium text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="px-2 py-2 text-center">
            {label}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className={cn("grid grid-cols-7", wi > 0 && "border-t border-slate-100")}>
          {week.map((day) => {
            const key = dayKey(day);
            const inMonth = day.getUTCMonth() === currentMonth;
            const isToday = key === todayKey;
            const entries = entriesByDay.get(key) ?? [];
            const visible = entries.slice(0, MAX_VISIBLE_PER_DAY);
            const overflow = entries.length - visible.length;

            return (
              <div
                key={key}
                className={cn(
                  "flex min-h-[110px] flex-col gap-1 border-r border-slate-100 p-1.5 last:border-r-0",
                  !inMonth && "bg-slate-50/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    isToday ? "bg-primary text-white" : inMonth ? "text-navy" : "text-slate-300",
                  )}
                >
                  {day.getUTCDate()}
                </span>
                <div className="flex flex-col gap-1">
                  {visible.map((entry) => {
                    const color = entryColor(entry);
                    const content = (
                      <span
                        className="block truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
                        style={{ backgroundColor: `${color}22`, color }}
                      >
                        {formatTime(entry.startsAt)} {entry.title}
                      </span>
                    );
                    return entry.href ? (
                      <Link key={entry.id} href={entry.href} className="hover:opacity-80">
                        {content}
                      </Link>
                    ) : (
                      <div key={entry.id}>{content}</div>
                    );
                  })}
                  {overflow > 0 && <span className="px-1.5 text-[11px] text-slate-400">+{overflow} autre{overflow > 1 ? "s" : ""}</span>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
