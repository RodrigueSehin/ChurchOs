import "server-only";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { authUsers, people, visits } from "@/lib/db/schema";

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";

export const VISITS_PAGE_SIZE = 20;

function monthStartISO(monthsOffset = 0): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsOffset);
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const NOT_DONE = sql`${visits.status} in ('new','in_progress','waiting')`;

/** Utilisée par la page Suivi pastoral (carte KPI "Visites pastorales") — voir la règle de
 * façade cross-module dans 01-project-structure.md. Compte sur `created_at` (date réelle de
 * l'enregistrement), pas `scheduled_at` (peut être dans le futur ou nul). */
export async function getVisitsThisMonthKpi(organizationId: string) {
  const thisMonthStart = monthStartISO(0);
  const nextMonthStart = monthStartISO(1);
  const lastMonthStart = monthStartISO(-1);
  const [[thisMonth], [lastMonth]] = await Promise.all([
    db
      .select({ value: count() })
      .from(visits)
      .where(and(eq(visits.organizationId, organizationId), sql`${visits.createdAt}::date >= ${thisMonthStart} and ${visits.createdAt}::date < ${nextMonthStart}`)),
    db
      .select({ value: count() })
      .from(visits)
      .where(and(eq(visits.organizationId, organizationId), sql`${visits.createdAt}::date >= ${lastMonthStart} and ${visits.createdAt}::date < ${thisMonthStart}`)),
  ]);
  const nowValue = thisMonth?.value ?? 0;
  const beforeValue = lastMonth?.value ?? 0;
  const deltaPct = beforeValue <= 0 ? (nowValue > 0 ? 100 : 0) : Math.round(((nowValue - beforeValue) / beforeValue) * 100);
  return { value: nowValue, deltaPct };
}

export interface VisitsListParams {
  organizationId: string;
  search?: string;
  status?: string;
  visitType?: string;
  assignedToUserId?: string;
  /** `"upcoming"`/`"done"`/`"inProgress"`/`"overdue"` — voir `getVisitsTabCounts`. */
  view?: string;
  page?: number;
}

export async function getVisits({ organizationId, search, status, visitType, assignedToUserId, view, page = 1 }: VisitsListParams) {
  const conditions = [eq(visits.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(visits.location, term))!);
  }
  if (status) {
    conditions.push(eq(visits.status, status as (typeof visits.status.enumValues)[number]));
  }
  if (visitType) {
    conditions.push(eq(visits.visitType, visitType as (typeof visits.visitType.enumValues)[number]));
  }
  if (assignedToUserId) conditions.push(eq(visits.assignedToUserId, assignedToUserId));
  const now = new Date().toISOString();
  if (view === "upcoming") conditions.push(and(NOT_DONE, sql`${visits.scheduledAt} >= ${now}`)!);
  else if (view === "done") conditions.push(eq(visits.status, "completed"));
  else if (view === "inProgress") conditions.push(eq(visits.status, "in_progress"));
  else if (view === "overdue") conditions.push(and(NOT_DONE, sql`${visits.scheduledAt} < ${now}`)!);
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: visits.id,
        visitType: visits.visitType,
        status: visits.status,
        scheduledAt: visits.scheduledAt,
        location: visits.location,
        purpose: visits.purpose,
        summary: visits.summary,
        nextAction: visits.nextAction,
        nextActionDate: visits.nextActionDate,
        personId: visits.personId,
        assignedToUserId: visits.assignedToUserId,
        assignedToEmail: authUsers.email,
        personFirstName: people.firstName,
        personLastName: people.lastName,
      })
      .from(visits)
      .innerJoin(people, eq(people.id, visits.personId))
      .leftJoin(authUsers, eq(authUsers.id, visits.assignedToUserId))
      .where(where)
      .orderBy(desc(visits.scheduledAt), desc(visits.createdAt))
      .limit(VISITS_PAGE_SIZE)
      .offset((page - 1) * VISITS_PAGE_SIZE),
    db.select({ value: count() }).from(visits).innerJoin(people, eq(people.id, visits.personId)).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: VISITS_PAGE_SIZE };
}

/** 4 cartes KPI réelles ("En retard"/"À venir" sont dérivés de `status` + `scheduled_at`, pas des
 * colonnes — voir `NOT_DONE`). */
export async function getVisitsKpis(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const now = new Date().toISOString();
  const base = eq(visits.organizationId, organizationId);
  const baseBefore = and(base, sql`${visits.createdAt}::date <= ${cutoff30}`);

  const [[doneNow], [doneBefore], [upcomingNow], [upcomingBefore], [inProgressNow], [inProgressBefore], [overdueNow], [overdueBefore]] = await Promise.all([
    db.select({ value: count() }).from(visits).where(and(base, eq(visits.status, "completed"))),
    db.select({ value: count() }).from(visits).where(and(baseBefore, eq(visits.status, "completed"))),
    db.select({ value: count() }).from(visits).where(and(base, NOT_DONE, sql`${visits.scheduledAt} >= ${now}`)),
    db.select({ value: count() }).from(visits).where(and(baseBefore, NOT_DONE, sql`${visits.scheduledAt} >= ${now}`)),
    db.select({ value: count() }).from(visits).where(and(base, eq(visits.status, "in_progress"))),
    db.select({ value: count() }).from(visits).where(and(baseBefore, eq(visits.status, "in_progress"))),
    db.select({ value: count() }).from(visits).where(and(base, NOT_DONE, sql`${visits.scheduledAt} < ${now}`)),
    db.select({ value: count() }).from(visits).where(and(baseBefore, NOT_DONE, sql`${visits.scheduledAt} < ${now}`)),
  ]);

  return {
    done: { value: doneNow?.value ?? 0, deltaPct: pctDelta(doneNow?.value ?? 0, doneBefore?.value ?? 0) },
    upcoming: { value: upcomingNow?.value ?? 0, deltaPct: pctDelta(upcomingNow?.value ?? 0, upcomingBefore?.value ?? 0) },
    inProgress: { value: inProgressNow?.value ?? 0, deltaPct: pctDelta(inProgressNow?.value ?? 0, inProgressBefore?.value ?? 0) },
    overdue: { value: overdueNow?.value ?? 0, deltaPct: pctDelta(overdueNow?.value ?? 0, overdueBefore?.value ?? 0) },
  };
}

export async function getVisitsTabCounts(organizationId: string) {
  const now = new Date().toISOString();
  const base = eq(visits.organizationId, organizationId);

  const [[all], [upcoming], [done], [inProgress], [overdue]] = await Promise.all([
    db.select({ value: count() }).from(visits).where(base),
    db.select({ value: count() }).from(visits).where(and(base, NOT_DONE, sql`${visits.scheduledAt} >= ${now}`)),
    db.select({ value: count() }).from(visits).where(and(base, eq(visits.status, "completed"))),
    db.select({ value: count() }).from(visits).where(and(base, eq(visits.status, "in_progress"))),
    db.select({ value: count() }).from(visits).where(and(base, NOT_DONE, sql`${visits.scheduledAt} < ${now}`)),
  ]);

  return {
    all: all?.value ?? 0,
    upcoming: upcoming?.value ?? 0,
    done: done?.value ?? 0,
    inProgress: inProgress?.value ?? 0,
    overdue: overdue?.value ?? 0,
  };
}
