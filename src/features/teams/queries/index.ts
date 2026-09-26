import "server-only";
import { and, asc, count, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { ministries, people, teamMembers, teams } from "@/lib/db/schema";

export async function getTeams(organizationId: string) {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      ministryId: teams.ministryId,
      ministryName: ministries.name,
      leaderPersonId: teams.leaderPersonId,
      leaderFirstName: people.firstName,
      leaderLastName: people.lastName,
    })
    .from(teams)
    .leftJoin(ministries, eq(ministries.id, teams.ministryId))
    .leftJoin(people, eq(people.id, teams.leaderPersonId))
    .where(eq(teams.organizationId, organizationId))
    .orderBy(asc(teams.name));

  const teamIds = rows.map((r) => r.id);
  const memberCounts = teamIds.length
    ? await db
        .select({ teamId: teamMembers.teamId, value: count() })
        .from(teamMembers)
        .where(eq(teamMembers.organizationId, organizationId))
        .groupBy(teamMembers.teamId)
    : [];
  const countByTeam = new Map(memberCounts.map((m) => [m.teamId, m.value]));

  return rows.map((r) => ({ ...r, memberCount: countByTeam.get(r.id) ?? 0 }));
}

export async function getTeamMembers(organizationId: string, teamId: string) {
  return db
    .select({
      teamMemberId: teamMembers.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      role: teamMembers.role,
      status: teamMembers.status,
    })
    .from(teamMembers)
    .innerJoin(people, eq(people.id, teamMembers.personId))
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.organizationId, organizationId)))
    .orderBy(asc(people.firstName));
}
