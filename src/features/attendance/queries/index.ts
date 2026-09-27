import "server-only";
import { and, asc, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { attendanceRecords, attendanceSessions, events, people, services } from "@/lib/db/schema";

export async function getAttendanceSessions({ organizationId, eventId }: { organizationId: string; eventId?: string }) {
  const conditions = [eq(attendanceSessions.organizationId, organizationId)];
  if (eventId) conditions.push(eq(attendanceSessions.eventId, eventId));
  const where = and(...conditions);

  const rows = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.title,
      startsAt: attendanceSessions.startsAt,
      endsAt: attendanceSessions.endsAt,
      location: attendanceSessions.location,
      eventId: attendanceSessions.eventId,
      eventTitle: events.title,
      serviceId: attendanceSessions.serviceId,
      serviceTitle: services.title,
    })
    .from(attendanceSessions)
    .leftJoin(events, eq(events.id, attendanceSessions.eventId))
    .leftJoin(services, eq(services.id, attendanceSessions.serviceId))
    .where(where)
    .orderBy(desc(attendanceSessions.startsAt));

  const sessionIds = rows.map((r) => r.id);
  const recordCounts = sessionIds.length
    ? await db
        .select({ sessionId: attendanceRecords.sessionId, value: count() })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.organizationId, organizationId))
        .groupBy(attendanceRecords.sessionId)
    : [];
  const countBySession = new Map(recordCounts.map((r) => [r.sessionId, r.value]));

  return rows.map((r) => ({ ...r, recordCount: countBySession.get(r.id) ?? 0 }));
}

export async function getAttendanceRecords(organizationId: string, sessionId: string) {
  return db
    .select({
      id: attendanceRecords.id,
      personId: attendanceRecords.personId,
      status: attendanceRecords.status,
      method: attendanceRecords.method,
      checkedInAt: attendanceRecords.checkedInAt,
      firstName: people.firstName,
      lastName: people.lastName,
    })
    .from(attendanceRecords)
    .innerJoin(people, eq(people.id, attendanceRecords.personId))
    .where(and(eq(attendanceRecords.sessionId, sessionId), eq(attendanceRecords.organizationId, organizationId)))
    .orderBy(asc(people.firstName));
}
