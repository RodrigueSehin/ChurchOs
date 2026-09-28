import "server-only";
import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, visitors } from "@/lib/db/schema";

export const VISITORS_PAGE_SIZE = 20;

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Utilisée par le tableau de bord et la page Membres (carte KPI "Visiteurs") — voir la règle de
 * façade cross-module dans 01-project-structure.md. */
export async function getVisitorsKpi(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const [[now], [before]] = await Promise.all([
    db.select({ value: count() }).from(visitors).where(and(eq(visitors.organizationId, organizationId), ne(visitors.status, "archived"))),
    db
      .select({ value: count() })
      .from(visitors)
      .where(
        and(
          eq(visitors.organizationId, organizationId),
          ne(visitors.status, "archived"),
          sql`${visitors.createdAt}::date <= ${cutoff30}`,
        ),
      ),
  ]);
  const nowValue = now?.value ?? 0;
  const beforeValue = before?.value ?? 0;
  const deltaPct = beforeValue <= 0 ? (nowValue > 0 ? 100 : 0) : Math.round(((nowValue - beforeValue) / beforeValue) * 100);
  return { value: nowValue, deltaPct };
}

export async function getVisitors({
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
  const conditions = [eq(people.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(people.phone, term))!);
  }
  if (status) {
    conditions.push(eq(visitors.status, status as (typeof visitors.status.enumValues)[number]));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        visitorId: visitors.id,
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        phone: people.phone,
        status: visitors.status,
        firstVisitDate: visitors.firstVisitDate,
        followUpDate: visitors.followUpDate,
        source: visitors.source,
      })
      .from(visitors)
      .innerJoin(people, eq(people.id, visitors.personId))
      .where(where)
      .orderBy(desc(visitors.firstVisitDate))
      .limit(VISITORS_PAGE_SIZE)
      .offset((page - 1) * VISITORS_PAGE_SIZE),
    db.select({ value: count() }).from(visitors).innerJoin(people, eq(people.id, visitors.personId)).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: VISITORS_PAGE_SIZE };
}

export async function getVisitorDetail(organizationId: string, visitorId: string) {
  const [row] = await db
    .select({ visitor: visitors, person: people })
    .from(visitors)
    .innerJoin(people, eq(people.id, visitors.personId))
    .where(and(eq(visitors.id, visitorId), eq(visitors.organizationId, organizationId)));
  return row ?? null;
}
