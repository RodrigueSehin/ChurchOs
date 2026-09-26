import "server-only";
import { and, asc, count, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, workers } from "@/lib/db/schema";

export const WORKERS_PAGE_SIZE = 20;

export async function getWorkers({
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
  const conditions = [eq(workers.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(workers.workerNumber, term))!);
  }
  if (status) {
    conditions.push(eq(workers.status, status as (typeof workers.status.enumValues)[number]));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: workers.id,
        personId: workers.personId,
        workerNumber: workers.workerNumber,
        status: workers.status,
        skills: workers.skills,
        notes: workers.notes,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        phone: people.phone,
      })
      .from(workers)
      .innerJoin(people, eq(people.id, workers.personId))
      .where(where)
      .orderBy(asc(people.firstName))
      .limit(WORKERS_PAGE_SIZE)
      .offset((page - 1) * WORKERS_PAGE_SIZE),
    db.select({ value: count() }).from(workers).innerJoin(people, eq(people.id, workers.personId)).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: WORKERS_PAGE_SIZE };
}

/** Ouvriers actifs, pour peupler les sélecteurs d'affectation (services, planning). */
export async function getActiveWorkersForSelect(organizationId: string) {
  const rows = await db
    .select({ id: workers.id, firstName: people.firstName, lastName: people.lastName })
    .from(workers)
    .innerJoin(people, eq(people.id, workers.personId))
    .where(and(eq(workers.organizationId, organizationId), eq(workers.status, "active")))
    .orderBy(asc(people.firstName));
  return rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}` }));
}
