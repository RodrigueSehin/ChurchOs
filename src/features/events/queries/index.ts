import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { eventCategories, eventRegistrations, events, profiles } from "@/lib/db/schema";

export const EVENTS_PAGE_SIZE = 20;

const EVENT_STATUSES = ["draft", "published", "cancelled", "completed", "archived"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function yearStart(yearsAgo = 0): Date {
  const year = new Date().getUTCFullYear() - yearsAgo;
  return new Date(Date.UTC(year, 0, 1));
}

function monthRange(monthsAgo = 0): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo + 1, 1));
  return { start, end };
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** KPI "Événements cette année" réutilisé par la page Ministères — même logique
 * cross-module que `getVisitsThisMonthKpi`/`getPrayerRequestsThisMonthKpi` pour Suivi pastoral :
 * un vrai décompte d'évènements, gaté par l'appelant sur `events.view`. */
export async function getEventsThisYearKpi(organizationId: string) {
  const thisYearStart = yearStart(0);
  const lastYearStart = yearStart(1);

  const [[now], [before]] = await Promise.all([
    db
      .select({ value: count() })
      .from(events)
      .where(and(eq(events.organizationId, organizationId), gte(events.startsAt, thisYearStart))),
    db
      .select({ value: count() })
      .from(events)
      .where(and(eq(events.organizationId, organizationId), gte(events.startsAt, lastYearStart), lt(events.startsAt, thisYearStart))),
  ]);

  return { value: now?.value ?? 0, deltaPct: pctDelta(now?.value ?? 0, before?.value ?? 0) };
}

export async function getEventCategories(organizationId: string) {
  return db.select().from(eventCategories).where(eq(eventCategories.organizationId, organizationId)).orderBy(asc(eventCategories.name));
}

export interface EventsListParams {
  organizationId: string;
  search?: string;
  status?: string;
  categoryId?: string;
  location?: string;
  view?: string;
  userId?: string;
  page?: number;
}

export async function getEvents({ organizationId, search, status, categoryId, location, view, userId, page = 1 }: EventsListParams) {
  const conditions = [eq(events.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(events.title, `%${search.trim()}%`));
  if (status && (EVENT_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(events.status, status as (typeof EVENT_STATUSES)[number]));
  }
  if (categoryId && UUID_RE.test(categoryId)) conditions.push(eq(events.categoryId, categoryId));
  if (location?.trim()) conditions.push(eq(events.location, location.trim()));
  if (view === "upcoming") conditions.push(and(eq(events.status, "published"), gte(events.startsAt, new Date()))!);
  else if (view === "past") conditions.push(lt(events.startsAt, new Date()));
  else if (view === "mine" && userId) conditions.push(eq(events.createdBy, userId));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: events.id,
        title: events.title,
        description: events.description,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        location: events.location,
        status: events.status,
        visibility: events.visibility,
        registrationEnabled: events.registrationEnabled,
        capacity: events.capacity,
        price: events.price,
        imageUrl: events.imageUrl,
        categoryId: events.categoryId,
        categoryName: eventCategories.name,
        organizerName: profiles.displayName,
      })
      .from(events)
      .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
      .leftJoin(profiles, eq(profiles.id, events.organizerUserId))
      .where(where)
      .orderBy(desc(events.startsAt))
      .limit(EVENTS_PAGE_SIZE)
      .offset((page - 1) * EVENTS_PAGE_SIZE),
    db.select({ value: count() }).from(events).where(where),
  ]);

  const eventIds = rows.map((r) => r.id);
  const registrationCounts = eventIds.length
    ? await db
        .select({ eventId: eventRegistrations.eventId, value: count() })
        .from(eventRegistrations)
        .where(and(eq(eventRegistrations.organizationId, organizationId), inArray(eventRegistrations.eventId, eventIds)))
        .groupBy(eventRegistrations.eventId)
    : [];
  const countByEvent = new Map(registrationCounts.map((r) => [r.eventId, r.value]));

  return {
    rows: rows.map((r) => ({ ...r, registrationCount: countByEvent.get(r.id) ?? 0 })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: EVENTS_PAGE_SIZE,
  };
}

export async function getEventDetail(organizationId: string, eventId: string) {
  const [row] = await db
    .select({ event: events, categoryName: eventCategories.name })
    .from(events)
    .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
    .where(and(eq(events.id, eventId), eq(events.organizationId, organizationId)));
  if (!row) return null;

  const registrationCountRows = await db
    .select({ value: count() })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.eventId, eventId));
  const registrationCount = registrationCountRows[0]?.value ?? 0;

  return { ...row, registrationCount };
}

/** Prochains événements publiés — utilisé par l'assistant ChurchOS AI (Phase 15) et le tableau de
 * bord, gaté sur `events.view` par l'appelant. */
export async function getUpcomingEvents(organizationId: string, limit = 5) {
  return db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt, endsAt: events.endsAt, location: events.location })
    .from(events)
    .where(and(eq(events.organizationId, organizationId), eq(events.status, "published"), gte(events.startsAt, new Date())))
    .orderBy(asc(events.startsAt))
    .limit(limit);
}

export async function getEventsForSelect(organizationId: string) {
  return db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt })
    .from(events)
    .where(eq(events.organizationId, organizationId))
    .orderBy(desc(events.startsAt));
}

export async function getEventsTabCounts(organizationId: string, userId: string) {
  const now = new Date();
  const [[all], [upcoming], [past], [mine]] = await Promise.all([
    db.select({ value: count() }).from(events).where(eq(events.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(events)
      .where(and(eq(events.organizationId, organizationId), eq(events.status, "published"), gte(events.startsAt, now))),
    db.select({ value: count() }).from(events).where(and(eq(events.organizationId, organizationId), lt(events.startsAt, now))),
    db.select({ value: count() }).from(events).where(and(eq(events.organizationId, organizationId), eq(events.createdBy, userId))),
  ]);
  return { all: all?.value ?? 0, upcoming: upcoming?.value ?? 0, past: past?.value ?? 0, mine: mine?.value ?? 0 };
}

/** Dates (jour) des événements sur une période — alimente les puces de la mini-calendrier de la
 * sidebar Événements, sans dépendre du module Calendrier. */
export async function getEventDatesInRange(organizationId: string, from: Date, to: Date) {
  const rows = await db
    .select({ startsAt: events.startsAt })
    .from(events)
    .where(and(eq(events.organizationId, organizationId), gte(events.startsAt, from), lt(events.startsAt, to)));
  return new Set(rows.map((r) => r.startsAt.toISOString().slice(0, 10)));
}

/** Valeurs de lieu réellement saisies — pas une liste figée. */
export async function getEventLocations(organizationId: string) {
  const rows = await db
    .selectDistinct({ location: events.location })
    .from(events)
    .where(and(eq(events.organizationId, organizationId), isNotNull(events.location)));
  return rows.map((r) => r.location as string).sort((a, b) => a.localeCompare(b, "fr"));
}

/** 4 cartes KPI — "Taux de participation" dérivé du vrai statut d'inscription
 * (`attended` / (`attended` + `confirmed` + `no_show`), c-à-d des inscrits réellement attendus à
 * l'événement) ; "Participants" = inscriptions confirmées ou honorées, jamais annulées/en attente. */
export async function getEventsKpis(organizationId: string) {
  const thisYearStart = yearStart(0);
  const lastYearStart = yearStart(1);
  const { start: thisMonthStart, end: thisMonthEnd } = monthRange(0);
  const { start: lastMonthStart, end: lastMonthEnd } = monthRange(1);

  const [
    totalKpi,
    [participantsNow],
    [participantsBefore],
    regStatusNow,
    regStatusBefore,
    [upcomingThisMonth],
    [upcomingLastMonth],
  ] = await Promise.all([
    getEventsThisYearKpi(organizationId),
    db
      .select({ value: count() })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.startsAt, thisYearStart),
          inArray(eventRegistrations.status, ["confirmed", "attended"]),
        ),
      ),
    db
      .select({ value: count() })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .where(
        and(
          eq(events.organizationId, organizationId),
          gte(events.startsAt, lastYearStart),
          lt(events.startsAt, thisYearStart),
          inArray(eventRegistrations.status, ["confirmed", "attended"]),
        ),
      ),
    db
      .select({ status: eventRegistrations.status, value: count() })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .where(and(eq(events.organizationId, organizationId), gte(events.startsAt, thisYearStart)))
      .groupBy(eventRegistrations.status),
    db
      .select({ status: eventRegistrations.status, value: count() })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .where(and(eq(events.organizationId, organizationId), gte(events.startsAt, lastYearStart), lt(events.startsAt, thisYearStart)))
      .groupBy(eventRegistrations.status),
    db
      .select({ value: count() })
      .from(events)
      .where(
        and(eq(events.organizationId, organizationId), eq(events.status, "published"), gte(events.startsAt, thisMonthStart), lt(events.startsAt, thisMonthEnd)),
      ),
    db
      .select({ value: count() })
      .from(events)
      .where(
        and(eq(events.organizationId, organizationId), eq(events.status, "published"), gte(events.startsAt, lastMonthStart), lt(events.startsAt, lastMonthEnd)),
      ),
  ]);

  function participationRate(rows: { status: string; value: number }[]) {
    const byStatus = new Map(rows.map((r) => [r.status, r.value]));
    const attended = byStatus.get("attended") ?? 0;
    const expected = attended + (byStatus.get("confirmed") ?? 0) + (byStatus.get("no_show") ?? 0);
    return expected > 0 ? Math.round((attended / expected) * 100) : 0;
  }
  const rateNow = participationRate(regStatusNow);
  const rateBefore = participationRate(regStatusBefore);

  return {
    total: totalKpi,
    participants: { value: participantsNow?.value ?? 0, deltaPct: pctDelta(participantsNow?.value ?? 0, participantsBefore?.value ?? 0) },
    participationRate: { value: rateNow, deltaPct: pctDelta(rateNow, rateBefore) },
    upcomingThisMonth: { value: upcomingThisMonth?.value ?? 0, deltaPct: pctDelta(upcomingThisMonth?.value ?? 0, upcomingLastMonth?.value ?? 0) },
  };
}
