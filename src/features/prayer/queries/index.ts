import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { authUsers, people, prayerRequests, prayerUpdates } from "@/lib/db/schema";
import { confidentialBooleanFilter, type ConfidentialityContext } from "@/lib/rbac/confidentiality";

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";

export const PRAYER_PAGE_SIZE = 20;

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
