import "server-only";
import { and, count, desc, eq, gte, isNotNull, lt, or, ilike } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { attendanceRecords, attendanceSessions, events, members, people, services, visitors } from "@/lib/db/schema";

export const ATTENDANCE_PAGE_SIZE = 20;

const ATTENDANCE_STATUSES = ["present", "absent", "excused", "late"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function startOfDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 3600 * 1000);
}
/** Semaine ISO, lundi comme premier jour — cohérent avec `buildMonthGrid` du module Calendrier. */
function startOfWeek(d = new Date()): Date {
  const day = startOfDay(d);
  const offset = (day.getUTCDay() + 6) % 7;
  return addDays(day, -offset);
}
function startOfMonth(d = new Date(), monthsAgo = 0): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsAgo, 1));
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

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
    .orderBy(desc(people.firstName));
}

// NOTE (`getAttendanceTabCounts`/`getAttendanceRecordsList` `source`) : une session doit toujours
// être rattachée à un événement ou un service (`attendance_sessions_context_check`, et le même
// `.refine` côté `attendanceSessionSchema`) — il n'existe donc pas de bucket "manuel" à part au
// sens de rattachement ; "manuel" ne désigne ici que la *méthode* de saisie d'une présence
// (`attendance_records.method = 'manual'`, vs `'qr'`), pas une 3e catégorie de session.

/** Sessions disponibles pour le sélecteur de saisie manuelle — les plus récentes d'abord. */
export async function getAttendanceSessionOptions(organizationId: string) {
  return db
    .select({ id: attendanceSessions.id, title: attendanceSessions.title, startsAt: attendanceSessions.startsAt })
    .from(attendanceSessions)
    .where(eq(attendanceSessions.organizationId, organizationId))
    .orderBy(desc(attendanceSessions.startsAt));
}

export interface AttendanceListParams {
  organizationId: string;
  search?: string;
  status?: string;
  source?: string;
  sessionId?: string;
  period?: string;
  page?: number;
}

function periodStart(period?: string): Date | null {
  if (period === "today") return startOfDay();
  if (period === "month") return startOfMonth();
  if (period === "all") return null;
  return startOfWeek();
}

export async function getAttendanceRecordsList({ organizationId, search, status, source, sessionId, period, page = 1 }: AttendanceListParams) {
  const conditions = [eq(attendanceRecords.organizationId, organizationId)];
  if (status && (ATTENDANCE_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(attendanceRecords.status, status as (typeof ATTENDANCE_STATUSES)[number]));
  }
  if (sessionId && UUID_RE.test(sessionId)) conditions.push(eq(attendanceRecords.sessionId, sessionId));
  if (source === "event") conditions.push(isNotNull(attendanceSessions.eventId));
  else if (source === "service") conditions.push(isNotNull(attendanceSessions.serviceId));
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term))!);
  }
  const from = periodStart(period);
  if (from) conditions.push(gte(attendanceSessions.startsAt, from));
  const where = and(...conditions);

  const baseQuery = db
    .select({
      id: attendanceRecords.id,
      status: attendanceRecords.status,
      method: attendanceRecords.method,
      checkedInAt: attendanceRecords.checkedInAt,
      personId: attendanceRecords.personId,
      firstName: people.firstName,
      lastName: people.lastName,
      photoUrl: people.photoUrl,
      sessionId: attendanceSessions.id,
      sessionTitle: attendanceSessions.title,
      sessionStartsAt: attendanceSessions.startsAt,
      eventId: attendanceSessions.eventId,
      serviceId: attendanceSessions.serviceId,
      isMember: isNotNull(members.id),
      isVisitor: isNotNull(visitors.id),
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
    .innerJoin(people, eq(people.id, attendanceRecords.personId))
    .leftJoin(members, eq(members.personId, people.id))
    .leftJoin(visitors, eq(visitors.personId, people.id));

  const [rows, totalRows] = await Promise.all([
    baseQuery
      .where(where)
      .orderBy(desc(attendanceSessions.startsAt))
      .limit(ATTENDANCE_PAGE_SIZE)
      .offset((page - 1) * ATTENDANCE_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .innerJoin(people, eq(people.id, attendanceRecords.personId))
      .leftJoin(members, eq(members.personId, people.id))
      .leftJoin(visitors, eq(visitors.personId, people.id))
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: ATTENDANCE_PAGE_SIZE };
}

export async function getAttendanceTabCounts(organizationId: string) {
  const base = eq(attendanceRecords.organizationId, organizationId);

  const [[all], [event], [service]] = await Promise.all([
    db.select({ value: count() }).from(attendanceRecords).where(base),
    db
      .select({ value: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .where(and(base, isNotNull(attendanceSessions.eventId))),
    db
      .select({ value: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .where(and(base, isNotNull(attendanceSessions.serviceId))),
  ]);
  return { all: all?.value ?? 0, event: event?.value ?? 0, service: service?.value ?? 0 };
}

/** 4 cartes KPI reproduisant exactement les périodes mixtes de la maquette — 3 "vs semaine
 * dernière", 1 "vs mois dernier" (même conception que le batch précédent, ex. Ouvriers). */
export async function getAttendanceKpis(organizationId: string) {
  const thisWeekStart = startOfWeek();
  const lastWeekStart = addDays(thisWeekStart, -7);
  const thisMonthStart = startOfMonth();
  const lastMonthStart = startOfMonth(new Date(), 1);

  async function presentCount(from: Date, to: Date) {
    const [row] = await db
      .select({ value: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.status, "present"),
          gte(attendanceSessions.startsAt, from),
          lt(attendanceSessions.startsAt, to),
        ),
      );
    return row?.value ?? 0;
  }

  async function rateFor(from: Date, to: Date) {
    const rows = await db
      .select({ status: attendanceRecords.status, value: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .where(and(eq(attendanceRecords.organizationId, organizationId), gte(attendanceSessions.startsAt, from), lt(attendanceSessions.startsAt, to)))
      .groupBy(attendanceRecords.status);
    const total = rows.reduce((sum, r) => sum + r.value, 0);
    const present = rows.find((r) => r.status === "present")?.value ?? 0;
    return total > 0 ? Math.round((present / total) * 100) : 0;
  }

  const [presentThisWeek, presentLastWeek, membersPresentRows, visitorsPresentRows, rateThisMonth, rateLastMonth] = await Promise.all([
    presentCount(thisWeekStart, addDays(thisWeekStart, 7)),
    presentCount(lastWeekStart, thisWeekStart),
    db
      .select({ value: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .innerJoin(members, eq(members.personId, attendanceRecords.personId))
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.status, "present"),
          gte(attendanceSessions.startsAt, thisWeekStart),
        ),
      ),
    db
      .select({ value: count() })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
      .innerJoin(visitors, eq(visitors.personId, attendanceRecords.personId))
      .where(
        and(
          eq(attendanceRecords.organizationId, organizationId),
          eq(attendanceRecords.status, "present"),
          gte(attendanceSessions.startsAt, thisWeekStart),
        ),
      ),
    rateFor(thisMonthStart, addDays(new Date(), 1)),
    rateFor(lastMonthStart, thisMonthStart),
  ]);

  return {
    presentThisWeek: { value: presentThisWeek, deltaPct: pctDelta(presentThisWeek, presentLastWeek) },
    membersPresent: { value: membersPresentRows[0]?.value ?? 0 },
    visitorsPresent: { value: visitorsPresentRows[0]?.value ?? 0 },
    presenceRate: { value: rateThisMonth, deltaPct: pctDelta(rateThisMonth, rateLastMonth) },
  };
}

/** Répartition Membres/Visiteurs/Autres des présences du jour — "Autres" couvre toute personne
 * enregistrée présente qui n'a ni fiche `members` ni fiche `visitors` (ex. un enfant ou un
 * intervenant ponctuel), jamais une catégorie inventée comme "Enfants"/"Équipes" sans colonne
 * réelle pour les distinguer. */
export async function getTodayPresenceBreakdown(organizationId: string) {
  const todayStart = startOfDay();
  const todayEnd = addDays(todayStart, 1);
  const rows = await db
    .select({ personId: attendanceRecords.personId, isMember: isNotNull(members.id), isVisitor: isNotNull(visitors.id) })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
    .leftJoin(members, eq(members.personId, attendanceRecords.personId))
    .leftJoin(visitors, eq(visitors.personId, attendanceRecords.personId))
    .where(
      and(
        eq(attendanceRecords.organizationId, organizationId),
        eq(attendanceRecords.status, "present"),
        gte(attendanceSessions.startsAt, todayStart),
        lt(attendanceSessions.startsAt, todayEnd),
      ),
    );

  let members_ = 0;
  let visitors_ = 0;
  let others = 0;
  for (const r of rows) {
    if (r.isMember) members_++;
    else if (r.isVisitor) visitors_++;
    else others++;
  }
  return { total: rows.length, members: members_, visitors: visitors_, others };
}

/** Sessions du jour avec un statut "en direct" dérivé de l'heure réelle — En cours / À venir /
 * Terminée, jamais une valeur stockée (aucune colonne de statut sur `attendance_sessions`). */
export async function getTodaySessions(organizationId: string) {
  const todayStart = startOfDay();
  const todayEnd = addDays(todayStart, 1);
  const now = new Date();

  const rows = await db
    .select({
      id: attendanceSessions.id,
      title: attendanceSessions.title,
      startsAt: attendanceSessions.startsAt,
      endsAt: attendanceSessions.endsAt,
      capacity: events.capacity,
    })
    .from(attendanceSessions)
    .leftJoin(events, eq(events.id, attendanceSessions.eventId))
    .where(
      and(eq(attendanceSessions.organizationId, organizationId), gte(attendanceSessions.startsAt, todayStart), lt(attendanceSessions.startsAt, todayEnd)),
    )
    .orderBy(attendanceSessions.startsAt);

  const sessionIds = rows.map((r) => r.id);
  const recordCounts = sessionIds.length
    ? await db
        .select({ sessionId: attendanceRecords.sessionId, value: count() })
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.organizationId, organizationId), eq(attendanceRecords.status, "present")))
        .groupBy(attendanceRecords.sessionId)
    : [];
  const countBySession = new Map(recordCounts.map((r) => [r.sessionId, r.value]));

  return rows.map((r) => {
    const status: "live" | "upcoming" | "ended" = now < r.startsAt ? "upcoming" : r.endsAt && now > r.endsAt ? "ended" : "live";
    return { ...r, presentCount: countBySession.get(r.id) ?? 0, liveStatus: status };
  });
}
