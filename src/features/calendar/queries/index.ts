import "server-only";
import { and, eq, gte, lte, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/lib/db/client";
import { calendarItems, eventCategories, events, planningSlots, serviceTypes, services } from "@/lib/db/schema";

export interface CalendarEntry {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  source: "event" | "service" | "planning" | "manual";
  category: string | null;
  color: string | null;
  href?: string;
}

/**
 * Agrège les modules pertinents pour le calendrier (critère de sortie de la Phase 8) : requête
 * en direct sur `events`/`services`/`planning_slots` plutôt que de dépendre d'une synchronisation
 * vers `calendar_items` — `calendar_items` (aussi interrogé ici) ne sert que pour les entrées
 * manuelles, aucun trigger ne le peuple depuis les autres tables (vérifié dans `db/schema.sql`).
 */
export async function getCalendarItems({
  organizationId,
  from,
  to,
}: {
  organizationId: string;
  from?: Date;
  to?: Date;
}): Promise<CalendarEntry[]> {
  const rangeConditions = (col: AnyPgColumn): SQL[] => {
    const c: SQL[] = [];
    if (from) c.push(gte(col, from));
    if (to) c.push(lte(col, to));
    return c;
  };

  const [eventRows, serviceRows, planningRows, manualRows] = await Promise.all([
    db
      .select({
        id: events.id,
        title: events.title,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        category: eventCategories.name,
        color: eventCategories.color,
      })
      .from(events)
      .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
      .where(and(eq(events.organizationId, organizationId), ...rangeConditions(events.startsAt))),
    db
      .select({
        id: services.id,
        title: services.title,
        startsAt: services.startsAt,
        endsAt: services.endsAt,
        category: serviceTypes.name,
      })
      .from(services)
      .leftJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
      .where(and(eq(services.organizationId, organizationId), ...rangeConditions(services.startsAt))),
    db
      .select({ id: planningSlots.id, title: planningSlots.title, startsAt: planningSlots.startsAt, endsAt: planningSlots.endsAt, category: planningSlots.category })
      .from(planningSlots)
      .where(and(eq(planningSlots.organizationId, organizationId), ...rangeConditions(planningSlots.startsAt))),
    db
      .select({ id: calendarItems.id, title: calendarItems.title, startsAt: calendarItems.startsAt, endsAt: calendarItems.endsAt, category: calendarItems.category, color: calendarItems.color })
      .from(calendarItems)
      .where(and(eq(calendarItems.organizationId, organizationId), ...rangeConditions(calendarItems.startsAt))),
  ]);

  const entries: CalendarEntry[] = [
    ...eventRows.map((r) => ({ ...r, source: "event" as const, href: `/events/${r.id}` })),
    ...serviceRows.map((r) => ({ ...r, source: "service" as const, color: null, href: "/services" })),
    ...planningRows.map((r) => ({ ...r, source: "planning" as const, color: null, href: "/planning" })),
    ...manualRows.map((r) => ({ ...r, source: "manual" as const })),
  ];

  return entries.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function summarizeBySource(entries: CalendarEntry[]) {
  return {
    total: entries.length,
    services: entries.filter((e) => e.source === "service").length,
    planning: entries.filter((e) => e.source === "planning").length,
    manual: entries.filter((e) => e.source === "manual").length,
  };
}

/** 4 cartes KPI — vraie répartition par source plutôt que les libellés flous de la maquette
 * ("Réunions régulières"/"Formations", sans notion correspondante réelle) : le seul découpage
 * honnête que `getCalendarItems` permet est par origine (événement/service/planning/manuel). */
export async function getCalendarKpis(organizationId: string) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - 1);
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const lastMonthEnd = new Date(monthStart.getTime() - 1);

  const [thisMonth, lastMonth] = await Promise.all([
    getCalendarItems({ organizationId, from: monthStart, to: monthEnd }),
    getCalendarItems({ organizationId, from: lastMonthStart, to: lastMonthEnd }),
  ]);

  const now_ = summarizeBySource(thisMonth);
  const before = summarizeBySource(lastMonth);

  return {
    total: { value: now_.total, deltaPct: pctDelta(now_.total, before.total) },
    services: { value: now_.services, deltaPct: pctDelta(now_.services, before.services) },
    planning: { value: now_.planning, deltaPct: pctDelta(now_.planning, before.planning) },
    manual: { value: now_.manual, deltaPct: pctDelta(now_.manual, before.manual) },
  };
}
