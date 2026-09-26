import "server-only";
import { and, asc, count, eq, ilike } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { ministries, ministryMembers, people } from "@/lib/db/schema";

export const MINISTRIES_PAGE_SIZE = 20;

export async function getMinistries({
  organizationId,
  search,
  page = 1,
}: {
  organizationId: string;
  search?: string;
  page?: number;
}) {
  const conditions = [eq(ministries.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(ministries.name, `%${search.trim()}%`));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: ministries.id,
        name: ministries.name,
        code: ministries.code,
        status: ministries.status,
        color: ministries.color,
        leaderFirstName: people.firstName,
        leaderLastName: people.lastName,
      })
      .from(ministries)
      .leftJoin(people, eq(people.id, ministries.leaderPersonId))
      .where(where)
      .orderBy(asc(ministries.name))
      .limit(MINISTRIES_PAGE_SIZE)
      .offset((page - 1) * MINISTRIES_PAGE_SIZE),
    db.select({ value: count() }).from(ministries).where(where),
  ]);

  const ministryIds = rows.map((r) => r.id);
  const memberCounts = ministryIds.length
    ? await db
        .select({ ministryId: ministryMembers.ministryId, value: count() })
        .from(ministryMembers)
        .where(and(eq(ministryMembers.organizationId, organizationId), eq(ministryMembers.isActive, true)))
        .groupBy(ministryMembers.ministryId)
    : [];
  const countByMinistry = new Map(memberCounts.map((m) => [m.ministryId, m.value]));

  return {
    rows: rows.map((r) => ({ ...r, memberCount: countByMinistry.get(r.id) ?? 0 })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: MINISTRIES_PAGE_SIZE,
  };
}

export async function getMinistryDetail(organizationId: string, ministryId: string) {
  const [ministry] = await db
    .select()
    .from(ministries)
    .where(and(eq(ministries.id, ministryId), eq(ministries.organizationId, organizationId)));
  if (!ministry) return null;

  const leader = ministry.leaderPersonId
    ? (
        await db
          .select({ firstName: people.firstName, lastName: people.lastName })
          .from(people)
          .where(eq(people.id, ministry.leaderPersonId))
      )[0]
    : null;

  const members = await db
    .select({
      ministryMemberId: ministryMembers.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      phone: people.phone,
      role: ministryMembers.role,
      isActive: ministryMembers.isActive,
      joinedAt: ministryMembers.joinedAt,
    })
    .from(ministryMembers)
    .innerJoin(people, eq(people.id, ministryMembers.personId))
    .where(and(eq(ministryMembers.ministryId, ministryId), eq(ministryMembers.isActive, true)))
    .orderBy(asc(people.firstName));

  return { ministry, members, leader };
}

export async function getMinistriesForSelect(organizationId: string) {
  const rows = await db
    .select({ id: ministries.id, name: ministries.name })
    .from(ministries)
    .where(and(eq(ministries.organizationId, organizationId), eq(ministries.status, "active")))
    .orderBy(asc(ministries.name));
  return rows;
}
