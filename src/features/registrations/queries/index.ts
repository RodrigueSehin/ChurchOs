import "server-only";
import { and, count, desc, eq, gte, ilike, isNull, isNotNull, lt, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { eventRegistrations, events, people } from "@/lib/db/schema";

export const REGISTRATIONS_PAGE_SIZE = 20;

const REGISTRATION_STATUSES = ["pending", "confirmed", "waitlisted", "cancelled", "attended", "no_show"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function yearStart(yearsAgo = 0): Date {
  const year = new Date().getUTCFullYear() - yearsAgo;
  return new Date(Date.UTC(year, 0, 1));
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export interface RegistrationsListParams {
  organizationId: string;
  search?: string;
  status?: string;
  eventId?: string;
  participantType?: string;
  page?: number;
}

export async function getRegistrations({ organizationId, eventId, search, status, participantType, page = 1 }: RegistrationsListParams) {
  const conditions = [eq(eventRegistrations.organizationId, organizationId)];
  if (eventId && UUID_RE.test(eventId)) conditions.push(eq(eventRegistrations.eventId, eventId));
  if (status && (REGISTRATION_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(eventRegistrations.status, status as (typeof REGISTRATION_STATUSES)[number]));
  }
  if (participantType === "member") conditions.push(isNotNull(eventRegistrations.personId));
  else if (participantType === "guest") conditions.push(isNull(eventRegistrations.personId));
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
        amount: eventRegistrations.amount,
        paymentStatus: eventRegistrations.paymentStatus,
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

export async function getRegistrationsTabCounts(organizationId: string) {
  const base = eq(eventRegistrations.organizationId, organizationId);
  const [[all], [confirmed], [pending], [cancelled]] = await Promise.all([
    db.select({ value: count() }).from(eventRegistrations).where(base),
    db.select({ value: count() }).from(eventRegistrations).where(and(base, eq(eventRegistrations.status, "confirmed"))),
    db.select({ value: count() }).from(eventRegistrations).where(and(base, eq(eventRegistrations.status, "pending"))),
    db.select({ value: count() }).from(eventRegistrations).where(and(base, eq(eventRegistrations.status, "cancelled"))),
  ]);
  return { all: all?.value ?? 0, confirmed: confirmed?.value ?? 0, pending: pending?.value ?? 0, cancelled: cancelled?.value ?? 0 };
}

/** 4 cartes KPI — "vs année dernière", même fenêtre que Ministères/Événements. */
export async function getRegistrationsKpis(organizationId: string) {
  const thisYearStart = yearStart(0);
  const lastYearStart = yearStart(1);
  const base = eq(eventRegistrations.organizationId, organizationId);

  async function countFor(statusValue: (typeof REGISTRATION_STATUSES)[number] | null, from: Date, to?: Date) {
    const conditions = [base, gte(eventRegistrations.registeredAt, from)];
    if (to) conditions.push(lt(eventRegistrations.registeredAt, to));
    if (statusValue) conditions.push(eq(eventRegistrations.status, statusValue));
    const [row] = await db.select({ value: count() }).from(eventRegistrations).where(and(...conditions));
    return row?.value ?? 0;
  }

  const [totalNow, totalBefore, confirmedNow, confirmedBefore, pendingNow, pendingBefore, cancelledNow, cancelledBefore] = await Promise.all([
    countFor(null, thisYearStart),
    countFor(null, lastYearStart, thisYearStart),
    countFor("confirmed", thisYearStart),
    countFor("confirmed", lastYearStart, thisYearStart),
    countFor("pending", thisYearStart),
    countFor("pending", lastYearStart, thisYearStart),
    countFor("cancelled", thisYearStart),
    countFor("cancelled", lastYearStart, thisYearStart),
  ]);

  return {
    total: { value: totalNow, deltaPct: pctDelta(totalNow, totalBefore) },
    confirmed: { value: confirmedNow, deltaPct: pctDelta(confirmedNow, confirmedBefore) },
    pending: { value: pendingNow, deltaPct: pctDelta(pendingNow, pendingBefore) },
    cancelled: { value: cancelledNow, deltaPct: pctDelta(cancelledNow, cancelledBefore) },
  };
}

/** Top événements par nombre d'inscriptions — alimente la barre "Inscriptions par événement". */
export async function getRegistrationsByEvent(organizationId: string, limit = 7) {
  const rows = await db
    .select({ eventId: events.id, eventTitle: events.title, value: count() })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .where(eq(eventRegistrations.organizationId, organizationId))
    .groupBy(events.id, events.title)
    .orderBy(desc(count()))
    .limit(limit);
  return rows;
}

export async function getRegistrationsStatusBreakdown(organizationId: string) {
  const rows = await db
    .select({ status: eventRegistrations.status, value: count() })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.organizationId, organizationId))
    .groupBy(eventRegistrations.status);
  return rows;
}

export async function getRegistrationsForExport(organizationId: string) {
  return db
    .select({
      status: eventRegistrations.status,
      registeredAt: eventRegistrations.registeredAt,
      personId: eventRegistrations.personId,
      guestName: eventRegistrations.guestName,
      guestEmail: eventRegistrations.guestEmail,
      personFirstName: people.firstName,
      personLastName: people.lastName,
      personEmail: people.email,
      eventTitle: events.title,
      amount: eventRegistrations.amount,
      paymentStatus: eventRegistrations.paymentStatus,
    })
    .from(eventRegistrations)
    .innerJoin(events, eq(events.id, eventRegistrations.eventId))
    .leftJoin(people, eq(people.id, eventRegistrations.personId))
    .where(eq(eventRegistrations.organizationId, organizationId))
    .orderBy(desc(eventRegistrations.registeredAt));
}
