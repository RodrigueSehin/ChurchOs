import "server-only";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { authUsers, people, prayerRequests, prayerUpdates } from "@/lib/db/schema";
import { confidentialBooleanFilter, type ConfidentialityContext } from "@/lib/rbac/confidentiality";

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";

export const PRAYER_PAGE_SIZE = 20;

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

/** Utilisée par la page Suivi pastoral (carte KPI "Sujets de prière") — voir la règle de façade
 * cross-module dans 01-project-structure.md. Ne filtre pas par confidentialité : un total agrégé
 * ("combien de sujets ce mois-ci"), pas une liste de contenus, donc rien de confidentiel n'est
 * exposé par ce seul chiffre. */
export async function getPrayerRequestsThisMonthKpi(organizationId: string) {
  const thisMonthStart = monthStartISO(0);
  const nextMonthStart = monthStartISO(1);
  const lastMonthStart = monthStartISO(-1);
  const [[thisMonth], [lastMonth]] = await Promise.all([
    db
      .select({ value: count() })
      .from(prayerRequests)
      .where(and(eq(prayerRequests.organizationId, organizationId), sql`${prayerRequests.createdAt}::date >= ${thisMonthStart} and ${prayerRequests.createdAt}::date < ${nextMonthStart}`)),
    db
      .select({ value: count() })
      .from(prayerRequests)
      .where(and(eq(prayerRequests.organizationId, organizationId), sql`${prayerRequests.createdAt}::date >= ${lastMonthStart} and ${prayerRequests.createdAt}::date < ${thisMonthStart}`)),
  ]);
  const nowValue = thisMonth?.value ?? 0;
  const beforeValue = lastMonth?.value ?? 0;
  const deltaPct = beforeValue <= 0 ? (nowValue > 0 ? 100 : 0) : Math.round(((nowValue - beforeValue) / beforeValue) * 100);
  return { value: nowValue, deltaPct };
}

export interface PrayerRequestsParams {
  organizationId: string;
  ctx: ConfidentialityContext;
  search?: string;
  status?: string;
  category?: string;
  /** `"active"` (open+in_progress) / `"answered"` / `"urgent"` / `"recent"` (7 derniers jours). */
  view?: string;
  page?: number;
}

export async function getPrayerRequests({ organizationId, ctx, search, status, category, view, page = 1 }: PrayerRequestsParams) {
  const conditions = [
    eq(prayerRequests.organizationId, organizationId),
    confidentialBooleanFilter(ctx, prayerRequests.isConfidential, prayerRequests.createdBy, prayerRequests.assignedToUserId),
  ];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(prayerRequests.title, term), ilike(people.firstName, term), ilike(people.lastName, term))!);
  }
  if (status) {
    conditions.push(eq(prayerRequests.status, status as (typeof prayerRequests.status.enumValues)[number]));
  }
  if (category) conditions.push(eq(prayerRequests.category, category));
  if (view === "active") conditions.push(sql`${prayerRequests.status} in ('open','in_progress')`);
  else if (view === "answered") conditions.push(eq(prayerRequests.status, "answered"));
  else if (view === "urgent") conditions.push(eq(prayerRequests.priority, "urgent"));
  else if (view === "recent") conditions.push(sql`${prayerRequests.createdAt}::date >= ${daysAgoISO(7)}`);
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: prayerRequests.id,
        title: prayerRequests.title,
        status: prayerRequests.status,
        priority: prayerRequests.priority,
        category: prayerRequests.category,
        isConfidential: prayerRequests.isConfidential,
        createdAt: prayerRequests.createdAt,
        personId: people.id,
        personFirstName: people.firstName,
        personLastName: people.lastName,
        personPhotoUrl: people.photoUrl,
      })
      .from(prayerRequests)
      .leftJoin(people, eq(people.id, prayerRequests.personId))
      .where(where)
      .orderBy(desc(prayerRequests.createdAt))
      .limit(PRAYER_PAGE_SIZE)
      .offset((page - 1) * PRAYER_PAGE_SIZE),
    db.select({ value: count() }).from(prayerRequests).leftJoin(people, eq(people.id, prayerRequests.personId)).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: PRAYER_PAGE_SIZE };
}

/** 4 cartes KPI réelles — toutes filtrées par confidentialité. */
export async function getPrayerKpis(organizationId: string, ctx: ConfidentialityContext) {
  const cutoff30 = daysAgoISO(30);
  const confFilter = confidentialBooleanFilter(ctx, prayerRequests.isConfidential, prayerRequests.createdBy, prayerRequests.assignedToUserId);
  const base = and(eq(prayerRequests.organizationId, organizationId), confFilter);
  const baseBefore = and(base, sql`${prayerRequests.createdAt}::date <= ${cutoff30}`);

  const [[totalNow], [totalBefore], [answeredNow], [answeredBefore], [activeNow], [activeBefore], [urgentNow], [urgentBefore]] = await Promise.all([
    db.select({ value: count() }).from(prayerRequests).where(base),
    db.select({ value: count() }).from(prayerRequests).where(baseBefore),
    db.select({ value: count() }).from(prayerRequests).where(and(base, eq(prayerRequests.status, "answered"))),
    db.select({ value: count() }).from(prayerRequests).where(and(baseBefore, eq(prayerRequests.status, "answered"))),
    db.select({ value: count() }).from(prayerRequests).where(and(base, sql`${prayerRequests.status} in ('open','in_progress')`)),
    db.select({ value: count() }).from(prayerRequests).where(and(baseBefore, sql`${prayerRequests.status} in ('open','in_progress')`)),
    db.select({ value: count() }).from(prayerRequests).where(and(base, eq(prayerRequests.priority, "urgent"))),
    db.select({ value: count() }).from(prayerRequests).where(and(baseBefore, eq(prayerRequests.priority, "urgent"))),
  ]);

  return {
    total: { value: totalNow?.value ?? 0, deltaPct: pctDelta(totalNow?.value ?? 0, totalBefore?.value ?? 0) },
    answered: { value: answeredNow?.value ?? 0, deltaPct: pctDelta(answeredNow?.value ?? 0, answeredBefore?.value ?? 0) },
    active: { value: activeNow?.value ?? 0, deltaPct: pctDelta(activeNow?.value ?? 0, activeBefore?.value ?? 0) },
    urgent: { value: urgentNow?.value ?? 0, deltaPct: pctDelta(urgentNow?.value ?? 0, urgentBefore?.value ?? 0) },
  };
}

export async function getPrayerTabCounts(organizationId: string, ctx: ConfidentialityContext) {
  const confFilter = confidentialBooleanFilter(ctx, prayerRequests.isConfidential, prayerRequests.createdBy, prayerRequests.assignedToUserId);
  const base = and(eq(prayerRequests.organizationId, organizationId), confFilter);

  const [[all], [active], [answered], [urgent], [recent]] = await Promise.all([
    db.select({ value: count() }).from(prayerRequests).where(base),
    db.select({ value: count() }).from(prayerRequests).where(and(base, sql`${prayerRequests.status} in ('open','in_progress')`)),
    db.select({ value: count() }).from(prayerRequests).where(and(base, eq(prayerRequests.status, "answered"))),
    db.select({ value: count() }).from(prayerRequests).where(and(base, eq(prayerRequests.priority, "urgent"))),
    db.select({ value: count() }).from(prayerRequests).where(and(base, sql`${prayerRequests.createdAt}::date >= ${daysAgoISO(7)}`)),
  ]);

  return {
    all: all?.value ?? 0,
    active: active?.value ?? 0,
    answered: answered?.value ?? 0,
    urgent: urgent?.value ?? 0,
    recent: recent?.value ?? 0,
  };
}

export async function getPrayerCategories(organizationId: string) {
  const rows = await db
    .selectDistinct({ category: prayerRequests.category })
    .from(prayerRequests)
    .where(and(eq(prayerRequests.organizationId, organizationId), sql`${prayerRequests.category} is not null and ${prayerRequests.category} != ''`));
  return rows.map((r) => r.category as string).sort();
}

export async function getPrayerRequestDetail(organizationId: string, id: string, ctx: ConfidentialityContext) {
  const [row] = await db
    .select({ request: prayerRequests, person: people })
    .from(prayerRequests)
    .leftJoin(people, eq(people.id, prayerRequests.personId))
    .where(
      and(
        eq(prayerRequests.id, id),
        eq(prayerRequests.organizationId, organizationId),
        confidentialBooleanFilter(ctx, prayerRequests.isConfidential, prayerRequests.createdBy, prayerRequests.assignedToUserId),
      ),
    );
  if (!row) return null;

  const updates = await db
    .select({
      id: prayerUpdates.id,
      content: prayerUpdates.content,
      createdAt: prayerUpdates.createdAt,
      authorUserId: prayerUpdates.authorUserId,
      authorEmail: authUsers.email,
    })
    .from(prayerUpdates)
    .leftJoin(authUsers, eq(authUsers.id, prayerUpdates.authorUserId))
    .where(eq(prayerUpdates.prayerRequestId, id))
    .orderBy(desc(prayerUpdates.createdAt));

  return { ...row, updates };
}
