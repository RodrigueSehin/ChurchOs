import "server-only";
import { and, asc, count, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { campuses, members, people } from "@/lib/db/schema";

export const MEMBERS_PAGE_SIZE = 20;

export interface MembersListParams {
  organizationId: string;
  search?: string;
  status?: string;
  page?: number;
}

export async function getMembers({ organizationId, search, status, page = 1 }: MembersListParams) {
  const conditions = [eq(people.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(people.email, term), ilike(people.phone, term))!,
    );
  }
  if (status) {
    conditions.push(eq(members.status, status as (typeof members.status.enumValues)[number]));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        memberId: members.id,
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        preferredName: people.preferredName,
        email: people.email,
        phone: people.phone,
        photoUrl: people.photoUrl,
        status: members.status,
        membershipDate: members.membershipDate,
        campusName: campuses.name,
      })
      .from(members)
      .innerJoin(people, eq(people.id, members.personId))
      .leftJoin(campuses, eq(campuses.id, people.campusId))
      .where(where)
      .orderBy(asc(people.lastName), asc(people.firstName))
      .limit(MEMBERS_PAGE_SIZE)
      .offset((page - 1) * MEMBERS_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(members)
      .innerJoin(people, eq(people.id, members.personId))
      .where(where),
  ]);
  const total = totalRows[0]?.value ?? 0;

  return { rows, total, page, pageSize: MEMBERS_PAGE_SIZE };
}

export async function getMemberDetail(organizationId: string, memberId: string) {
  const [row] = await db
    .select({
      member: members,
      person: people,
      campusName: campuses.name,
    })
    .from(members)
    .innerJoin(people, eq(people.id, members.personId))
    .leftJoin(campuses, eq(campuses.id, people.campusId))
    .where(and(eq(members.id, memberId), eq(members.organizationId, organizationId)));

  return row ?? null;
}
