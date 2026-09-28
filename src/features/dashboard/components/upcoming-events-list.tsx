import { Clock, MapPin } from "lucide-react";

import type { getUpcomingEvents } from "@/features/events/queries";

type UpcomingEvent = Awaited<ReturnType<typeof getUpcomingEvents>>[number];

function formatTimeRange(startsAt: Date, endsAt: Date | null) {
  const fmt = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const start = fmt.format(startsAt).replace(":", "h");
  if (!endsAt) return start;
  return `${start} - ${fmt.format(endsAt).replace(":", "h")}`;
}

export function UpcomingEventsList({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucun événement à venir.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => {
        const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(event.startsAt).slice(0, 3).toUpperCase();
        const day = new Intl.DateTimeFormat("fr-FR", { day: "2-digit" }).format(event.startsAt);
        const month = new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(event.startsAt).toUpperCase();

        return (
          <div key={event.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
            <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-navy py-1.5 text-white">
              <span className="text-[10px] font-medium leading-none">{weekday}</span>
              <span className="mt-0.5 text-base font-bold leading-none">{day}</span>
              <span className="mt-0.5 text-[9px] leading-none text-white/70">{month}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy">{event.title}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                <Clock className="size-3" />
                {formatTimeRange(event.startsAt, event.endsAt)}
              </p>
              {event.location && (
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  <MapPin className="size-3" />
                  {event.location}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
