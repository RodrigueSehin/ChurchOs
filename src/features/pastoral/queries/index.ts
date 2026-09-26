import "server-only";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { authUsers, pastoralFollowups, pastoralNotes, people } from "@/lib/db/schema";
import { confidentialBooleanFilter, confidentialityLevelFilter, type ConfidentialityContext } from "@/lib/rbac/confidentiality";

export const PASTORAL_PAGE_SIZE = 20;

export async function getPastoralFollowups({
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
    eq(pastoralFollowups.organizationId, organizationId),
    confidentialityLevelFilter(ctx, pastoralFollowups.confidentiality, pastoralFollowups.createdBy, pastoralFollowups.assignedToUserId),
  ];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(pastoralFollowups.title, term), ilike(people.firstName, term), ilike(people.lastName, term))!);
  }
  if (status) {
    conditions.push(eq(pastoralFollowups.status, status as (typeof pastoralFollowups.status.enumValues)[number]));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: pastoralFollowups.id,
        title: pastoralFollowups.title,
        status: pastoralFollowups.status,
        priority: pastoralFollowups.priority,
        confidentiality: pastoralFollowups.confidentiality,
        dueDate: pastoralFollowups.dueDate,
        personFirstName: people.firstName,
        personLastName: people.lastName,
      })
      .from(pastoralFollowups)
      .innerJoin(people, eq(people.id, pastoralFollowups.personId))
      .where(where)
      .orderBy(desc(pastoralFollowups.createdAt))
      .limit(PASTORAL_PAGE_SIZE)
      .offset((page - 1) * PASTORAL_PAGE_SIZE),
    db.select({ value: count() }).from(pastoralFollowups).innerJoin(people, eq(people.id, pastoralFollowups.personId)).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: PASTORAL_PAGE_SIZE };
}

export async function getPastoralFollowupDetail(organizationId: string, id: string, ctx: ConfidentialityContext) {
  const [row] = await db
    .select({ followup: pastoralFollowups, person: people })
    .from(pastoralFollowups)
    .innerJoin(people, eq(people.id, pastoralFollowups.personId))
    .where(
      and(
        eq(pastoralFollowups.id, id),
        eq(pastoralFollowups.organizationId, organizationId),
        confidentialityLevelFilter(ctx, pastoralFollowups.confidentiality, pastoralFollowups.createdBy, pastoralFollowups.assignedToUserId),
      ),
    );
  if (!row) return null;

  const notes = await db
    .select({
      id: pastoralNotes.id,
      note: pastoralNotes.note,
      isPrivate: pastoralNotes.isPrivate,
      createdAt: pastoralNotes.createdAt,
      authorUserId: pastoralNotes.authorUserId,
      authorEmail: authUsers.email,
    })
    .from(pastoralNotes)
    .leftJoin(authUsers, eq(authUsers.id, pastoralNotes.authorUserId))
    .where(
      and(
        eq(pastoralNotes.followupId, id),
        confidentialBooleanFilter(ctx, pastoralNotes.isPrivate, pastoralNotes.authorUserId),
      ),
    )
    .orderBy(desc(pastoralNotes.createdAt));

  return { ...row, notes };
}

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";
