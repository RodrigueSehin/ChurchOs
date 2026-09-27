import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { eventRegistrations, events, people } from "@/lib/db/schema";

export const REGISTRATIONS_PAGE_SIZE = 20;

export async function getRegistrations({
  organizationId,
  eventId,
  search,
  page = 1,
}: {
  organizationId: string;
  eventId?: string;
  search?: string;
  page?: number;
}) {
  const conditions = [eq(eventRegistrations.organizationId, organizationId)];
  if (eventId) conditions.push(eq(eventRegistrations.eventId, eventId));
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(eventRegistrations.guestName, term))!);
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: eventRegistrations.id,
        status: eventRegistrations.status,
        registeredAt: eventRegistrations.registeredAt,
        qrToken: eventRegistrations.qrToken,
        personId: eventRegistrations.personId,
        guestName: eventRegistrations.guestName,
        guestEmail: eventRegistrations.guestEmail,
        personFirstName: people.firstName,
        personLastName: people.lastName,
        eventId: events.id,
        eventTitle: events.title,
      })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .leftJoin(people, eq(people.id, eventRegistrations.personId))
      .where(where)
      .orderBy(desc(eventRegistrations.registeredAt))
      .limit(REGISTRATIONS_PAGE_SIZE)
      .offset((page - 1) * REGISTRATIONS_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(eventRegistrations)
      .innerJoin(events, eq(events.id, eventRegistrations.eventId))
      .leftJoin(people, eq(people.id, eventRegistrations.personId))
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: REGISTRATIONS_PAGE_SIZE };
}
