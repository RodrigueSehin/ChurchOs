import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, visits } from "@/lib/db/schema";

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";

export const VISITS_PAGE_SIZE = 20;

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
