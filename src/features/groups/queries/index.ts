import "server-only";
import { and, asc, count, countDistinct, eq, ilike, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { groupMembers, groups, people } from "@/lib/db/schema";

export const GROUPS_PAGE_SIZE = 20;

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function monthStartISO(monthsOffset = 0): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsOffset);
  return d.toISOString().slice(0, 10);
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const GROUP_TYPES = ["cell", "home_group", "youth", "women", "men", "children", "prayer", "study", "team", "custom"] as const;
const MEETING_DAYS = ["0", "1", "2", "3", "4", "5", "6"];

export interface GroupsListParams {
  organizationId: string;
  search?: string;
  type?: string;
  isActive?: string;
  meetingDay?: string;
  page?: number;
}

export async function getGroups({ organizationId, search, type, isActive, meetingDay, page = 1 }: GroupsListParams) {
  const conditions = [eq(groups.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(groups.name, `%${search.trim()}%`));
  if (type && (GROUP_TYPES as readonly string[]).includes(type)) {
    conditions.push(eq(groups.type, type as (typeof groups.type.enumValues)[number]));
  }
  if (isActive === "true" || isActive === "false") conditions.push(eq(groups.isActive, isActive === "true"));
  if (meetingDay && MEETING_DAYS.includes(meetingDay)) conditions.push(eq(groups.meetingDay, Number(meetingDay)));
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

/** 5 cartes KPI de la maquette — toutes réelles. "Cellules de maison" = `type = 'home_group'`,
 * distinct de l'onglet "Cellules" (`type = 'cell'`) : ce sont deux vraies valeurs différentes de
 * l'enum `group_type`, pas la même chose reformulée. */
export async function getGroupsKpis(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const monthStart = monthStartISO(0);

  const [[groupsNow], [groupsBefore], [membersNow], [membersBefore], [newThisMonth], [leadersNow], [leadersBefore], [homeGroupsNow], [homeGroupsBefore]] =
    await Promise.all([
      db.select({ value: count() }).from(groups).where(eq(groups.organizationId, organizationId)),
      db.select({ value: count() }).from(groups).where(and(eq(groups.organizationId, organizationId), sql`${groups.createdAt}::date <= ${cutoff30}`)),
      db
        .select({ value: countDistinct(groupMembers.personId) })
        .from(groupMembers)
        .where(and(eq(groupMembers.organizationId, organizationId), eq(groupMembers.isActive, true))),
      db
        .select({ value: countDistinct(groupMembers.personId) })
        .from(groupMembers)
        .where(
          and(
            eq(groupMembers.organizationId, organizationId),
            eq(groupMembers.isActive, true),
            sql`${groupMembers.createdAt}::date <= ${cutoff30}`,
          ),
        ),
      db.select({ value: count() }).from(groups).where(and(eq(groups.organizationId, organizationId), sql`${groups.createdAt}::date >= ${monthStart}`)),
      db
        .select({ value: countDistinct(groups.leaderPersonId) })
        .from(groups)
        .where(and(eq(groups.organizationId, organizationId), isNotNull(groups.leaderPersonId))),
      db
        .select({ value: countDistinct(groups.leaderPersonId) })
        .from(groups)
        .where(
          and(
            eq(groups.organizationId, organizationId),
            isNotNull(groups.leaderPersonId),
            sql`${groups.createdAt}::date <= ${cutoff30}`,
          ),
        ),
      db.select({ value: count() }).from(groups).where(and(eq(groups.organizationId, organizationId), eq(groups.type, "home_group"))),
      db
        .select({ value: count() })
        .from(groups)
        .where(
          and(eq(groups.organizationId, organizationId), eq(groups.type, "home_group"), sql`${groups.createdAt}::date <= ${cutoff30}`),
        ),
    ]);

  return {
    groups: { value: groupsNow?.value ?? 0, deltaPct: pctDelta(groupsNow?.value ?? 0, groupsBefore?.value ?? 0) },
    members: { value: membersNow?.value ?? 0, deltaPct: pctDelta(membersNow?.value ?? 0, membersBefore?.value ?? 0) },
    newThisMonth: newThisMonth?.value ?? 0,
    leaders: { value: leadersNow?.value ?? 0, deltaPct: pctDelta(leadersNow?.value ?? 0, leadersBefore?.value ?? 0) },
    homeGroups: { value: homeGroupsNow?.value ?? 0, deltaPct: pctDelta(homeGroupsNow?.value ?? 0, homeGroupsBefore?.value ?? 0) },
  };
}

const TAB_TYPES = ["cell", "team", "youth", "women", "men", "children"] as const;

export async function getGroupsTypeTabCounts(organizationId: string) {
  const [[all], perType] = await Promise.all([
    db.select({ value: count() }).from(groups).where(eq(groups.organizationId, organizationId)),
    db
      .select({ type: groups.type, value: count() })
      .from(groups)
      .where(eq(groups.organizationId, organizationId))
      .groupBy(groups.type),
  ]);
  const byType = new Map(perType.map((r) => [r.type, r.value]));
  const counts: Record<string, number> = { all: all?.value ?? 0 };
  for (const t of TAB_TYPES) counts[t] = byType.get(t) ?? 0;
  return counts;
}
