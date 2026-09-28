import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { addMonths, dayKey, monthParamFor } from "@/features/calendar/lib/month";

const WEEKDAY_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"];

function hrefFor(monthParam: string, view: string) {
  return `/calendar?month=${monthParam}&view=${view}`;
}

export function MiniMonthCalendar({
  year,
  month,
  days,
  daysWithEntries,
  view,
}: {
  year: number;
  month: number;
  days: Date[];
  daysWithEntries: Set<string>;
  view: string;
}) {
  const today = dayKey(new Date());
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month, 1)));
  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-navy">{label}</p>
        <div className="flex items-center gap-1">
          <Link href={hrefFor(monthParamFor(prev.year, prev.month), view)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={hrefFor(monthParamFor(next.year, next.month), view)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-navy">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {WEEKDAY_LABELS.map((w) => (
          <span key={w} className="pb-1 font-medium text-slate-400">
            {w}
          </span>
        ))}
        {days.map((day) => {
          const key = dayKey(day);
          const inMonth = day.getUTCMonth() === month;
          const isToday = key === today;
          return (
            <span key={key} className="flex flex-col items-center gap-0.5 py-0.5">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full",
                  isToday ? "bg-primary font-medium text-white" : inMonth ? "text-slate-700" : "text-slate-300",
                )}
              >
                {day.getUTCDate()}
              </span>
              <span className={cn("size-1 rounded-full", daysWithEntries.has(key) && inMonth ? "bg-primary" : "bg-transparent")} />
            </span>
          );
        })}
      </div>
    </div>
  );
}
