import "server-only";
import { and, count, eq, inArray, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  announcementReads,
  announcements,
  announcementSocialPosts,
  attendanceRecords,
  attendanceSessions,
  courses,
  eventCategories,
  eventRegistrations,
  events,
  families,
  financialTransactions,
  members,
  messages,
  notifications,
  people,
  resourceReservations,
  resources,
  visitors,
  workers,
} from "@/lib/db/schema";
import type { StatsRange } from "@/features/analytics/period";

/**
 * Agrégations de la page Statistiques (refonte selon la maquette). Chaque fonction ne lit que ce
 * dont sa carte a besoin ; les données financières (`getGivingStats`) restent réservées à
 * l'appelant qui a vérifié `finance.view`.
 */

const iso = (d: Date) => d.toISOString();
const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** `col ∈ [from, to)` pour une colonne `timestamptz`. */
function tsIn(col: SQL | { name: string } | object, from: Date, to: Date): SQL {
  return sql`${col} >= ${iso(from)}::timestamptz and ${col} < ${iso(to)}::timestamptz`;
}

/** `col ∈ [from, to)` pour une colonne ou expression de type `date`. */
function dateIn(col: SQL | object, from: Date, to: Date): SQL {
  return sql`${col} >= ${isoDate(from)}::date and ${col} < ${isoDate(to)}::date`;
}

/** Variation en % ; `previous <= 0` évite la division par zéro (cf. tableau de bord). */
export function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const joinDate = sql`coalesce(${members.membershipDate}, ${members.createdAt}::date)`;

async function scalar(q: Promise<{ value: number | string | null }[]>): Promise<number> {
  const rows = await q;
  return Number(rows[0]?.value ?? 0);
}

export interface StatKpi {
  value: number;
  /** Variation vs période précédente (ou vs début de période pour les effectifs). */
  delta: number;
}

export interface StatsKpis {
  activeMembers: StatKpi;
  newMembers: StatKpi;
  events: StatKpi;
  attendanceRate: StatKpi;
  visitors: StatKpi;
  children: StatKpi;
  youth: StatKpi;
  workers: StatKpi;
  courses: StatKpi;
  families: StatKpi;
  roomsUsed: StatKpi;
}

async function attendanceRate(organizationId: string, from: Date, to: Date) {
  const [row] = await db
    .select({
      total: count(),
      present: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present','late'))`,
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
    .where(and(eq(attendanceRecords.organizationId, organizationId), tsIn(attendanceSessions.startsAt, from, to)));
  const total = Number(row?.total ?? 0);
  return total === 0 ? 0 : Math.round((Number(row?.present ?? 0) / total) * 100);
}

async function roomsUsedPct(organizationId: string, from: Date, to: Date) {
  const [total, used] = await Promise.all([
    scalar(
      db
        .select({ value: count() })
        .from(resources)
        .where(and(eq(resources.organizationId, organizationId), eq(resources.type, "room"), sql`${resources.status} not in ('draft','retired')`)),
    ),
    scalar(
      db
        .select({ value: sql<number>`count(distinct ${resourceReservations.resourceId})` })
        .from(resourceReservations)
        .innerJoin(resources, eq(resources.id, resourceReservations.resourceId))
        .where(
          and(
            eq(resourceReservations.organizationId, organizationId),
            eq(resources.type, "room"),
            sql`${resources.status} not in ('draft','retired')`,
            inArray(resourceReservations.status, ["confirmed", "completed"]),
            tsIn(resourceReservations.startsAt, from, to),
          ),
        ),
    ),
  ]);
  return total === 0 ? 0 : Math.round((used / total) * 100);
}

export async function getStatsKpis(organizationId: string, range: StatsRange): Promise<StatsKpis> {
  const { from, to, prevFrom } = range;
  const activeAt = (asOf?: Date) =>
    scalar(
      db
        .select({ value: count() })
        .from(members)
        .where(and(eq(members.organizationId, organizationId), eq(members.status, "active"), asOf ? sql`${joinDate} < ${isoDate(asOf)}::date` : undefined)),
    );
  const newMembers = (a: Date, b: Date) =>
    scalar(db.select({ value: count() }).from(members).where(and(eq(members.organizationId, organizationId), dateIn(joinDate, a, b))));
  const eventsIn = (a: Date, b: Date) =>
    scalar(
      db
        .select({ value: count() })
        .from(events)
        .where(and(eq(events.organizationId, organizationId), inArray(events.status, ["published", "completed"]), tsIn(events.startsAt, a, b))),
    );
  const visitorsIn = (a: Date, b: Date) =>
    scalar(db.select({ value: count() }).from(visitors).where(and(eq(visitors.organizationId, organizationId), dateIn(visitors.firstVisitDate, a, b))));
  const coursesIn = (a: Date, b: Date) =>
    scalar(
      db
        .select({ value: count() })
        .from(courses)
        .where(and(eq(courses.organizationId, organizationId), sql`${courses.status} <> 'draft'`, dateIn(sql`coalesce(${courses.publishedAt}, ${courses.createdAt}::date)`, a, b))),
    );

  /** Enfants (0-12) / Jeunes (13-25) parmi les membres actifs ayant une date de naissance,
   * maintenant et au début de la période (adhésion antérieure). */
  const ageBuckets = async () => {
    const age = sql`date_part('year', age(current_date, ${people.birthDate}))`;
    const [row] = await db
      .select({
        childrenNow: sql<number>`count(*) filter (where ${age} < 13)`,
        youthNow: sql<number>`count(*) filter (where ${age} >= 13 and ${age} < 26)`,
        childrenStart: sql<number>`count(*) filter (where ${age} < 13 and ${joinDate} < ${isoDate(from)}::date)`,
        youthStart: sql<number>`count(*) filter (where ${age} >= 13 and ${age} < 26 and ${joinDate} < ${isoDate(from)}::date)`,
      })
      .from(members)
      .innerJoin(people, eq(people.id, members.personId))
      .where(and(eq(members.organizationId, organizationId), eq(members.status, "active"), sql`${people.birthDate} is not null`));
    return {
      childrenNow: Number(row?.childrenNow ?? 0),
      youthNow: Number(row?.youthNow ?? 0),
      childrenStart: Number(row?.childrenStart ?? 0),
      youthStart: Number(row?.youthStart ?? 0),
    };
  };

  const [
    activeNow, activeStart, newCur, newPrev, evCur, evPrev, rateCur, ratePrev, visCur, visPrev, ages,
    workersNow, workersStart, coursesCur, coursesPrev, familiesNow, familiesStart, roomsCur, roomsPrev,
  ] = await Promise.all([
    activeAt(), activeAt(from),
    newMembers(from, to), newMembers(prevFrom, from),
    eventsIn(from, to), eventsIn(prevFrom, from),
    attendanceRate(organizationId, from, to), attendanceRate(organizationId, prevFrom, from),
    visitorsIn(from, to), visitorsIn(prevFrom, from),
    ageBuckets(),
    scalar(db.select({ value: count() }).from(workers).where(and(eq(workers.organizationId, organizationId), eq(workers.status, "active")))),
    scalar(db.select({ value: count() }).from(workers).where(and(eq(workers.organizationId, organizationId), eq(workers.status, "active"), sql`${workers.createdAt} < ${iso(from)}::timestamptz`))),
    coursesIn(from, to), coursesIn(prevFrom, from),
    scalar(db.select({ value: count() }).from(families).where(eq(families.organizationId, organizationId))),
    scalar(db.select({ value: count() }).from(families).where(and(eq(families.organizationId, organizationId), sql`${families.createdAt} < ${iso(from)}::timestamptz`))),
    roomsUsedPct(organizationId, from, to), roomsUsedPct(organizationId, prevFrom, from),
  ]);

  return {
    activeMembers: { value: activeNow, delta: pctDelta(activeNow, activeStart) },
    newMembers: { value: newCur, delta: pctDelta(newCur, newPrev) },
    events: { value: evCur, delta: pctDelta(evCur, evPrev) },
    // Taux : la variation est un écart en points, pas en pourcentage relatif.
    attendanceRate: { value: rateCur, delta: rateCur - ratePrev },
    visitors: { value: visCur, delta: pctDelta(visCur, visPrev) },
    children: { value: ages.childrenNow, delta: pctDelta(ages.childrenNow, ages.childrenStart) },
    youth: { value: ages.youthNow, delta: pctDelta(ages.youthNow, ages.youthStart) },
    workers: { value: workersNow, delta: pctDelta(workersNow, workersStart) },
    courses: { value: coursesCur, delta: pctDelta(coursesCur, coursesPrev) },
    families: { value: familiesNow, delta: pctDelta(familiesNow, familiesStart) },
    roomsUsed: { value: roomsCur, delta: roomsCur - roomsPrev },
  };
}

export interface GivingStats {
  total: number;
  monthlyAverage: number;
  delta: number;
  byMonth: { month: string; value: number }[];
}

/** Réservé à l'appelant (`finance.view`) — total des dons = revenus de la période. */
export async function getGivingStats(organizationId: string, range: StatsRange): Promise<GivingStats> {
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${financialTransactions.transactionDate}), 'YYYY-MM')`,
      value: sql<string>`coalesce(sum(${financialTransactions.amount}), 0)`,
    })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.organizationId, organizationId),
        eq(financialTransactions.type, "income"),
        dateIn(financialTransactions.transactionDate, range.prevFrom, range.to),
      ),
    )
    .groupBy(sql`1`);
  const byKey = new Map(rows.map((r) => [r.month, Number(r.value)]));
  const byMonth = range.months.map((month) => ({ month, value: byKey.get(month) ?? 0 }));
  const total = byMonth.reduce((s, m) => s + m.value, 0);
  const prevTotal = rows.filter((r) => r.month < range.months[0]!).reduce((s, r) => s + Number(r.value), 0);
  return { total, monthlyAverage: Math.round(total / range.months.length), delta: pctDelta(total, prevTotal), byMonth };
}

export type AttendanceCategory = "adults" | "youth" | "children" | "visitors";

/** Présences (présent ou en retard) par mois et par catégorie. Un visiteur (fiche `visitors`)
 * compte comme « Visiteurs » ; sans date de naissance, la personne est comptée parmi les
 * « Adultes » plutôt qu'exclue (sinon le graphique sous-estimerait la fréquentation). */
export async function getAttendanceEvolution(organizationId: string, range: StatsRange) {
  const age = sql`date_part('year', age(${attendanceSessions.startsAt}::date, ${people.birthDate}))`;
  const cat = sql<AttendanceCategory>`case
    when exists (select 1 from ${visitors} v where v.person_id = ${people.id}) then 'visitors'
    when ${people.birthDate} is null then 'adults'
    when ${age} < 13 then 'children'
    when ${age} < 26 then 'youth'
    else 'adults' end`;
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${attendanceSessions.startsAt}), 'YYYY-MM')`,
      cat,
      value: count(),
    })
    .from(attendanceRecords)
    .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceRecords.sessionId))
    .innerJoin(people, eq(people.id, attendanceRecords.personId))
    .where(
      and(
        eq(attendanceRecords.organizationId, organizationId),
        inArray(attendanceRecords.status, ["present", "late"]),
        tsIn(attendanceSessions.startsAt, range.from, range.to),
      ),
    )
    .groupBy(sql`1`, sql`2`);
  const key = new Map(rows.map((r) => [`${r.month}|${r.cat}`, Number(r.value)]));
  return range.months.map((month) => ({
    month,
    adults: key.get(`${month}|adults`) ?? 0,
    youth: key.get(`${month}|youth`) ?? 0,
    children: key.get(`${month}|children`) ?? 0,
    visitors: key.get(`${month}|visitors`) ?? 0,
  }));
}

export const AGE_BUCKETS = ["0-12", "13-25", "26-40", "41-60", "61+"] as const;

/** Membres actifs par tranche d'âge ; `unknown` = sans date de naissance (non répartis). */
export async function getAgeDistribution(organizationId: string) {
  const age = sql`date_part('year', age(current_date, ${people.birthDate}))`;
  const rows = await db
    .select({
      bucket: sql<string>`case
        when ${people.birthDate} is null then 'unknown'
        when ${age} < 13 then '0-12'
        when ${age} < 26 then '13-25'
        when ${age} < 41 then '26-40'
        when ${age} < 61 then '41-60'
        else '61+' end`,
      value: count(),
    })
    .from(members)
    .innerJoin(people, eq(people.id, members.personId))
    .where(and(eq(members.organizationId, organizationId), eq(members.status, "active")))
    .groupBy(sql`1`);
  const byBucket = new Map(rows.map((r) => [r.bucket, Number(r.value)]));
  return {
    rows: AGE_BUCKETS.map((bucket) => ({ bucket, value: byBucket.get(bucket) ?? 0 })),
    unknown: byBucket.get("unknown") ?? 0,
  };
}

/** Répartition exclusive : un membre actif qui est ouvrier actif compte comme « Ouvriers » ;
 * les autres par âge (sans date de naissance → Adultes) ; plus les visiteurs encore suivis. */
export async function getPeopleBreakdown(organizationId: string) {
  const age = sql`date_part('year', age(current_date, ${people.birthDate}))`;
  const [row] = await db
    .select({
      workers: sql<number>`count(*) filter (where w.person_id is not null)`,
      children: sql<number>`count(*) filter (where w.person_id is null and ${people.birthDate} is not null and ${age} < 13)`,
      youth: sql<number>`count(*) filter (where w.person_id is null and ${people.birthDate} is not null and ${age} >= 13 and ${age} < 26)`,
      adults: sql<number>`count(*) filter (where w.person_id is null and (${people.birthDate} is null or ${age} >= 26))`,
    })
    .from(members)
    .innerJoin(people, eq(people.id, members.personId))
    .leftJoin(sql`(select distinct person_id from ${workers} where status = 'active' and organization_id = ${organizationId}) w`, sql`w.person_id = ${members.personId}`)
    .where(and(eq(members.organizationId, organizationId), eq(members.status, "active")));
  const visitorsFollowed = await scalar(
    db
      .select({ value: count() })
      .from(visitors)
      .where(and(eq(visitors.organizationId, organizationId), sql`${visitors.status} not in ('converted','lost','archived')`)),
  );
  return {
    adults: Number(row?.adults ?? 0),
    youth: Number(row?.youth ?? 0),
    children: Number(row?.children ?? 0),
    workers: Number(row?.workers ?? 0),
    visitors: visitorsFollowed,
  };
}

/** Événements publiés/terminés de la période par catégorie (les 6 premières). */
export async function getActivitiesByCategory(organizationId: string, range: StatsRange) {
  const name = sql<string>`coalesce(${eventCategories.name}, 'Sans catégorie')`;
  const rows = await db
    .select({ name, value: count() })
    .from(events)
    .leftJoin(eventCategories, eq(eventCategories.id, events.categoryId))
    .where(and(eq(events.organizationId, organizationId), inArray(events.status, ["published", "completed"]), tsIn(events.startsAt, range.from, range.to)))
    .groupBy(sql`1`)
    .orderBy(sql`2 desc`, sql`1`)
    .limit(6);
  return rows.map((r) => ({ name: r.name, value: Number(r.value) }));
}

export async function getNewMembersByMonth(organizationId: string, range: StatsRange) {
  const rows = await db
    .select({ month: sql<string>`to_char(date_trunc('month', ${joinDate}), 'YYYY-MM')`, value: count() })
    .from(members)
    .where(and(eq(members.organizationId, organizationId), dateIn(joinDate, range.from, range.to)))
    .groupBy(sql`1`);
  const byKey = new Map(rows.map((r) => [r.month, Number(r.value)]));
  return range.months.map((month) => ({ month, value: byKey.get(month) ?? 0 }));
}

/** Taux d'occupation d'une salle = jours distincts avec une réservation confirmée/terminée ÷
 * jours écoulés de la période. */
export async function getRoomUsage(organizationId: string, range: StatsRange) {
  const rows = await db
    .select({
      id: resources.id,
      name: resources.name,
      days: sql<number>`count(distinct ${resourceReservations.startsAt}::date)`,
    })
    .from(resources)
    .leftJoin(
      resourceReservations,
      and(
        eq(resourceReservations.resourceId, resources.id),
        inArray(resourceReservations.status, ["confirmed", "completed"]),
        tsIn(resourceReservations.startsAt, range.from, range.until),
      ),
    )
    .where(and(eq(resources.organizationId, organizationId), eq(resources.type, "room"), sql`${resources.status} not in ('draft','retired')`))
    .groupBy(resources.id, resources.name)
    .orderBy(sql`3 desc`, resources.name)
    .limit(6);
  return rows.map((r) => ({ id: r.id, name: r.name, pct: Math.min(100, Math.round((Number(r.days) / range.elapsedDays) * 100)) }));
}

export async function getReservationStatus(organizationId: string, range: StatsRange) {
  const rows = await db
    .select({ status: resourceReservations.status, value: count() })
    .from(resourceReservations)
    .innerJoin(resources, eq(resources.id, resourceReservations.resourceId))
    .where(and(eq(resourceReservations.organizationId, organizationId), eq(resources.type, "room"), tsIn(resourceReservations.startsAt, range.from, range.to)))
    .groupBy(resourceReservations.status);
  return rows.map((r) => ({ status: r.status, value: Number(r.value) }));
}

/** Top 5 des événements de la période par participants : présences enregistrées, à défaut les
 * inscriptions confirmées. */
export async function getTopEvents(organizationId: string, range: StatsRange) {
  const attended = sql<number>`(select count(*) from ${attendanceRecords} ar join ${attendanceSessions} s on s.id = ar.session_id where s.event_id = ${events.id} and ar.status in ('present','late'))`;
  const registered = sql<number>`(select count(*) from ${eventRegistrations} er where er.event_id = ${events.id} and er.status in ('confirmed','attended'))`;
  const rows = await db
    .select({ id: events.id, title: events.title, participants: sql<number>`greatest(${attended}, ${registered})` })
    .from(events)
    .where(and(eq(events.organizationId, organizationId), inArray(events.status, ["published", "completed"]), tsIn(events.startsAt, range.from, range.to)))
    .orderBy(sql`3 desc`, events.title)
    .limit(5);
  return rows.map((r) => ({ id: r.id, title: r.title, participants: Number(r.participants) }));
}

export interface EngagementStats {
  messagesSent: StatKpi;
  recipients: StatKpi;
  socialPosts: StatKpi;
  announcementReads: StatKpi;
  announcementsPublished: StatKpi;
}

export async function getEngagement(organizationId: string, range: StatsRange): Promise<EngagementStats> {
  const { from, to, prevFrom } = range;
  const period = async (fn: (a: Date, b: Date) => Promise<number>): Promise<StatKpi> => {
    const [cur, prev] = await Promise.all([fn(from, to), fn(prevFrom, from)]);
    return { value: cur, delta: pctDelta(cur, prev) };
  };
  const [messagesSent, recipients, socialPosts, announcementReadsKpi, announcementsPublished] = await Promise.all([
    period((a, b) => scalar(db.select({ value: count() }).from(messages).where(and(eq(messages.organizationId, organizationId), tsIn(messages.sentAt, a, b))))),
    period((a, b) =>
      scalar(
        db
          .select({ value: sql<number>`count(distinct ${notifications.personId})` })
          .from(notifications)
          .where(and(eq(notifications.organizationId, organizationId), inArray(notifications.channel, ["email", "sms", "whatsapp"]), inArray(notifications.status, ["sent", "delivered", "read"]), tsIn(notifications.sentAt, a, b))),
      ),
    ),
    period((a, b) =>
      scalar(
        db
          .select({ value: count() })
          .from(announcementSocialPosts)
          .where(and(eq(announcementSocialPosts.organizationId, organizationId), inArray(announcementSocialPosts.status, ["published", "scheduled"]), tsIn(announcementSocialPosts.createdAt, a, b))),
      ),
    ),
    period((a, b) => scalar(db.select({ value: count() }).from(announcementReads).where(and(eq(announcementReads.organizationId, organizationId), tsIn(announcementReads.readAt, a, b))))),
    period((a, b) =>
      scalar(
        db
          .select({ value: count() })
          .from(announcements)
          .where(and(eq(announcements.organizationId, organizationId), eq(announcements.status, "published"), tsIn(sql`coalesce(${announcements.publishAt}, ${announcements.createdAt})`, a, b))),
      ),
    ),
  ]);
  return { messagesSent, recipients, socialPosts, announcementReads: announcementReadsKpi, announcementsPublished };
}
