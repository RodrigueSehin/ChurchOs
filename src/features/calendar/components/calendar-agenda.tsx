import Link from "next/link";
import { CalendarDays, ClipboardList, ListChecks, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CALENDAR_SOURCE_LABELS } from "@/features/calendar/schemas";
import { DeleteCalendarItemButton } from "@/features/calendar/components/delete-calendar-item-button";
import type { CalendarEntry } from "@/features/calendar/queries";

const SOURCE_ICON: Record<CalendarEntry["source"], typeof CalendarDays> = {
  event: CalendarDays,
  service: Sparkles,
  planning: ListChecks,
  manual: ClipboardList,
};

const SOURCE_VARIANT: Record<CalendarEntry["source"], "default" | "secondary" | "success" | "warning"> = {
  event: "default",
  service: "success",
  planning: "warning",
  manual: "secondary",
};

function formatDay(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { timeStyle: "short" }).format(value);
}

export function CalendarAgenda({ entries, canManage }: { entries: CalendarEntry[]; canManage: boolean }) {
  const groups = new Map<string, CalendarEntry[]>();
  for (const entry of entries) {
    const key = entry.startsAt.toDateString();
    const arr = groups.get(key) ?? [];
    arr.push(entry);
    groups.set(key, arr);
  }

  return (
    <div className="flex flex-col gap-6">
      {Array.from(groups.entries()).map(([key, dayEntries]) => (
        <div key={key} className="flex flex-col gap-2">
          <p className="text-sm font-semibold capitalize text-navy">{formatDay(dayEntries[0]!.startsAt)}</p>
          <Card>
            <div className="flex flex-col divide-y divide-slate-100">
              {dayEntries.map((entry) => {
                const Icon = SOURCE_ICON[entry.source];
                const content = (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Icon className="size-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{entry.title}</p>
                      <p className="text-xs text-slate-400">
                        {formatTime(entry.startsAt)}
                        {entry.endsAt ? ` – ${formatTime(entry.endsAt)}` : ""}
                      </p>
                    </div>
                    <Badge variant={SOURCE_VARIANT[entry.source]} className="shrink-0 text-[10px]">
                      {CALENDAR_SOURCE_LABELS[entry.source]}
                    </Badge>
                    {entry.source === "manual" && canManage && (
                      <DeleteCalendarItemButton itemId={entry.id} itemTitle={entry.title} />
                    )}
                  </div>
                );
                return entry.href ? (
                  <Link key={entry.id} href={entry.href} className="hover:bg-slate-50/60">
                    {content}
                  </Link>
                ) : (
                  <div key={entry.id}>{content}</div>
                );
              })}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}
