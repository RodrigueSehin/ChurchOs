import "server-only";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { eventCategories, eventRegistrations, events } from "@/lib/db/schema";

export const EVENTS_PAGE_SIZE = 20;

export async function getEventCategories(organizationId: string) {
  return db.select().from(eventCategories).where(eq(eventCategories.organizationId, organizationId)).orderBy(asc(eventCategories.name));
}

export async function getEvents({
  organizationId,
  search,
  status,
  page = 1,
}: {
  organizationId: string;
  search?: string;
  status?: string;
  page?: number;
}) {
  const conditions = [eq(events.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(events.title, `%${search.trim()}%`));
  if (status) conditions.push(eq(events.status, status as (typeof events.status.enumValues)[number]));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: events.id,
        title: events.title,
        startsAt: events.startsAt,
        endsAt: events.endsAt,
        location: events.location,
        status: events.status,
        visibility: events.visibility,
        registrationEnabled: events.registrationEnabled,
        categoryName: eventCategories.name,
      })
      .from(events)
      .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
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
        .where(eq(eventRegistrations.organizationId, organizationId))
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

export async function getEventsForSelect(organizationId: string) {
  return db
    .select({ id: events.id, title: events.title, startsAt: events.startsAt })
    .from(events)
    .where(eq(events.organizationId, organizationId))
    .orderBy(desc(events.startsAt));
}
