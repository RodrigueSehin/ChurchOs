import "server-only";
import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  authUsers,
  pastoralActions,
  pastoralCouncilMembers,
  pastoralCouncils,
  people,
} from "@/lib/db/schema";

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";

export async function getPastoralCouncils(organizationId: string) {
  return db
    .select()
    .from(pastoralCouncils)
    .where(eq(pastoralCouncils.organizationId, organizationId))
    .orderBy(desc(pastoralCouncils.meetingAt));
}

export async function getPastoralCouncilDetail(organizationId: string, councilId: string) {
  const [council] = await db
    .select()
    .from(pastoralCouncils)
    .where(eq(pastoralCouncils.id, councilId));
  if (!council || council.organizationId !== organizationId) return null;

  const members = await db
    .select({
      id: pastoralCouncilMembers.id,
      personId: pastoralCouncilMembers.personId,
      userId: pastoralCouncilMembers.userId,
      attendanceStatus: pastoralCouncilMembers.attendanceStatus,
      personFirstName: people.firstName,
      personLastName: people.lastName,
      userEmail: authUsers.email,
    })
    .from(pastoralCouncilMembers)
    .leftJoin(people, eq(people.id, pastoralCouncilMembers.personId))
    .leftJoin(authUsers, eq(authUsers.id, pastoralCouncilMembers.userId))
    .where(eq(pastoralCouncilMembers.councilId, councilId));

  const actions = await db
    .select({
      id: pastoralActions.id,
      title: pastoralActions.title,
      description: pastoralActions.description,
      status: pastoralActions.status,
      dueDate: pastoralActions.dueDate,
      assignedToUserId: pastoralActions.assignedToUserId,
      assignedToEmail: authUsers.email,
    })
    .from(pastoralActions)
    .leftJoin(authUsers, eq(authUsers.id, pastoralActions.assignedToUserId))
    .where(eq(pastoralActions.councilId, councilId))
    .orderBy(desc(pastoralActions.createdAt));

  return { council, members, actions };
}
