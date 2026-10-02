import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { ReservationEntry } from "@/features/resources/queries";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const CHIP: Record<string, string> = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-600",
};

/** Vue mensuelle des réservations (hors annulées) — `month` au format `YYYY-MM`. */
export function CalendarMonth({ year, month, reservations, hrefForMonth }: { year: number; month: number; reservations: ReservationEntry[]; hrefForMonth: (year: number, month: number) => string }) {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7; // lundi = 0
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const prev = new Date(Date.UTC(year, month - 1, 1));
  const next = new Date(Date.UTC(year, month + 1, 1));
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const isToday = (d: number) => today.getUTCFullYear() === year && today.getUTCMonth() === month && today.getUTCDate() === d;

  const byDay = new Map<number, ReservationEntry[]>();
  for (const r of reservations) {
    if (r.status === "cancelled") continue;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStart = Date.UTC(year, month, d);
      if (r.startsAt.getTime() < dayStart + 86400_000 && r.endsAt.getTime() > dayStart) byDay.set(d, [...(byDay.get(d) ?? []), r]);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold capitalize text-navy">{label}</h3>
        <div className="flex gap-1">
          <Link href={hrefForMonth(prev.getUTCFullYear(), prev.getUTCMonth())} aria-label="Mois précédent" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><ChevronLeft className="size-4" /></Link>
          <Link href={hrefForMonth(today.getUTCFullYear(), today.getUTCMonth())} className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">Aujourd&apos;hui</Link>
          <Link href={hrefForMonth(next.getUTCFullYear(), next.getUTCMonth())} aria-label="Mois suivant" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50"><ChevronRight className="size-4" /></Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-xl border border-slate-200 text-xs">
          {WEEKDAYS.map((d) => (
            <div key={d} className="border-b border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-semibold text-navy">{d}</div>
          ))}
          {cells.map((day, i) => (
            <div key={i} className={cn("min-h-24 border-b border-r border-slate-100 p-1.5", day === null && "bg-slate-50/50")}>
              {day !== null && (
                <>
                  <span className={cn("mb-1 inline-flex size-6 items-center justify-center rounded-full text-xs", isToday(day) ? "bg-primary font-bold text-white" : "text-slate-500")}>{day}</span>
                  <div className="flex flex-col gap-1">
                    {(byDay.get(day) ?? []).slice(0, 3).map((r) => (
                      <span key={r.id} title={`${r.resourceName} — ${r.purpose ?? "Réservation"}`} className={cn("truncate rounded px-1.5 py-0.5", CHIP[r.status])}>
                        {time.format(r.startsAt)} {r.resourceName}
                      </span>
                    ))}
                    {(byDay.get(day)?.length ?? 0) > 3 && <span className="px-1 text-slate-400">+{(byDay.get(day)?.length ?? 0) - 3}</span>}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
