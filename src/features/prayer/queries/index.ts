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

export async function getPrayerRequests({
  organizationId,
  ctx,
  search,
  status,
  page = 1,
}: {
  organizationId: string;
  ctx: ConfidentialityContext;
  search?: string;
  status?: string;
  page?: number;
}) {
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
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: prayerRequests.id,
        title: prayerRequests.title,
        status: prayerRequests.status,
        priority: prayerRequests.priority,
        isConfidential: prayerRequests.isConfidential,
        personFirstName: people.firstName,
        personLastName: people.lastName,
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
