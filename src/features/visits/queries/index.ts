import "server-only";
import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, visits } from "@/lib/db/schema";

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";

export const VISITS_PAGE_SIZE = 20;

function monthStartISO(monthsOffset = 0): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsOffset);
  return d.toISOString().slice(0, 10);
}

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

export async function getVisits({
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
  const conditions = [eq(visits.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(visits.location, term))!);
  }
  if (status) {
    conditions.push(eq(visits.status, status as (typeof visits.status.enumValues)[number]));
  }
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
        personFirstName: people.firstName,
        personLastName: people.lastName,
      })
      .from(visits)
      .innerJoin(people, eq(people.id, visits.personId))
      .where(where)
      .orderBy(desc(visits.scheduledAt), desc(visits.createdAt))
      .limit(VISITS_PAGE_SIZE)
      .offset((page - 1) * VISITS_PAGE_SIZE),
    db.select({ value: count() }).from(visits).innerJoin(people, eq(people.id, visits.personId)).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: VISITS_PAGE_SIZE };
}
