import "server-only";
import { and, asc, count, eq, ilike } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { groupMembers, groups, people } from "@/lib/db/schema";

export const GROUPS_PAGE_SIZE = 20;

export async function getGroups({
  organizationId,
  search,
  type,
  page = 1,
}: {
  organizationId: string;
  search?: string;
  type?: string;
  page?: number;
}) {
  const conditions = [eq(groups.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(groups.name, `%${search.trim()}%`));
  if (type) conditions.push(eq(groups.type, type as (typeof groups.type.enumValues)[number]));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: groups.id,
        name: groups.name,
        type: groups.type,
        meetingDay: groups.meetingDay,
        meetingTime: groups.meetingTime,
        isActive: groups.isActive,
        leaderFirstName: people.firstName,
        leaderLastName: people.lastName,
      })
      .from(groups)
      .leftJoin(people, eq(people.id, groups.leaderPersonId))
      .where(where)
      .orderBy(asc(groups.name))
      .limit(GROUPS_PAGE_SIZE)
      .offset((page - 1) * GROUPS_PAGE_SIZE),
    db.select({ value: count() }).from(groups).where(where),
  ]);

  const groupIds = rows.map((r) => r.id);
  const memberCounts = groupIds.length
    ? await db
        .select({ groupId: groupMembers.groupId, value: count() })
        .from(groupMembers)
        .where(and(eq(groupMembers.organizationId, organizationId), eq(groupMembers.isActive, true)))
        .groupBy(groupMembers.groupId)
    : [];
  const countByGroup = new Map(memberCounts.map((m) => [m.groupId, m.value]));

  return {
    rows: rows.map((r) => ({ ...r, memberCount: countByGroup.get(r.id) ?? 0 })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: GROUPS_PAGE_SIZE,
  };
}

export async function getGroupDetail(organizationId: string, groupId: string) {
  const [group] = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), eq(groups.organizationId, organizationId)));
  if (!group) return null;

  const members = await db
    .select({
      groupMemberId: groupMembers.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      phone: people.phone,
      role: groupMembers.role,
      isActive: groupMembers.isActive,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(people, eq(people.id, groupMembers.personId))
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.isActive, true)))
    .orderBy(asc(people.firstName));

  return { group, members };
}
