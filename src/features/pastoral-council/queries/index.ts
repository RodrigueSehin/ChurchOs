import "server-only";
import { and, count, desc, eq, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  authUsers,
  pastoralActions,
  pastoralCouncilMembers,
  pastoralCouncils,
  people,
} from "@/lib/db/schema";

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** `view` — `"planned"`/`"held"`/`"cancelled"` (vrais statuts de `pastoral_councils`) ou `"mine"`
 * (réunions où l'utilisateur courant est participant ou organisateur). */
export async function getPastoralCouncils(organizationId: string, view?: string, userId?: string) {
  const conditions = [eq(pastoralCouncils.organizationId, organizationId)];
  if (view === "planned" || view === "held" || view === "cancelled") {
    conditions.push(eq(pastoralCouncils.status, view));
  } else if (view === "mine" && userId) {
    conditions.push(
      sql`(${pastoralCouncils.createdBy} = ${userId} or exists (
        select 1 from pastoral_council_members pcm where pcm.council_id = ${pastoralCouncils.id} and pcm.user_id = ${userId}
      ))`,
    );
  }
  return db
    .select()
    .from(pastoralCouncils)
    .where(and(...conditions))
    .orderBy(desc(pastoralCouncils.meetingAt));
}

/** 4 cartes KPI réelles — "En cours"/"Cas urgents" de la maquette n'ont pas d'équivalent dans le
 * schéma (pas de statut "en cours" pour une réunion ponctuelle, pas de notion d'urgence) :
 * remplacées par "Planifiés" (statut réel `planned`) et "Actions en attente" (vraies
 * `pastoral_actions` non terminées, l'analogue réel le plus proche d'un "cas qui a besoin de
 * suite"). */
export async function getPastoralCouncilKpis(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const base = eq(pastoralCouncils.organizationId, organizationId);
  const baseBefore = and(base, sql`${pastoralCouncils.createdAt}::date <= ${cutoff30}`);

  const [[totalNow], [totalBefore], [plannedNow], [plannedBefore], [heldNow], [heldBefore], [pendingActions]] = await Promise.all([
    db.select({ value: count() }).from(pastoralCouncils).where(base),
    db.select({ value: count() }).from(pastoralCouncils).where(baseBefore),
    db.select({ value: count() }).from(pastoralCouncils).where(and(base, eq(pastoralCouncils.status, "planned"))),
    db.select({ value: count() }).from(pastoralCouncils).where(and(baseBefore, eq(pastoralCouncils.status, "planned"))),
    db.select({ value: count() }).from(pastoralCouncils).where(and(base, eq(pastoralCouncils.status, "held"))),
    db.select({ value: count() }).from(pastoralCouncils).where(and(baseBefore, eq(pastoralCouncils.status, "held"))),
    db
      .select({ value: count() })
      .from(pastoralActions)
      .innerJoin(pastoralCouncils, eq(pastoralCouncils.id, pastoralActions.councilId))
      .where(and(eq(pastoralCouncils.organizationId, organizationId), sql`${pastoralActions.status} in ('new','in_progress','waiting')`)),
  ]);

  return {
    total: { value: totalNow?.value ?? 0, deltaPct: pctDelta(totalNow?.value ?? 0, totalBefore?.value ?? 0) },
    planned: { value: plannedNow?.value ?? 0, deltaPct: pctDelta(plannedNow?.value ?? 0, plannedBefore?.value ?? 0) },
    held: { value: heldNow?.value ?? 0, deltaPct: pctDelta(heldNow?.value ?? 0, heldBefore?.value ?? 0) },
    pendingActions: pendingActions?.value ?? 0,
  };
}

export async function getPastoralCouncilTabCounts(organizationId: string, userId: string) {
  const base = eq(pastoralCouncils.organizationId, organizationId);
  const [[all], [planned], [held], [cancelled], [mine]] = await Promise.all([
    db.select({ value: count() }).from(pastoralCouncils).where(base),
    db.select({ value: count() }).from(pastoralCouncils).where(and(base, eq(pastoralCouncils.status, "planned"))),
    db.select({ value: count() }).from(pastoralCouncils).where(and(base, eq(pastoralCouncils.status, "held"))),
    db.select({ value: count() }).from(pastoralCouncils).where(and(base, eq(pastoralCouncils.status, "cancelled"))),
    db
      .select({ value: count() })
      .from(pastoralCouncils)
      .where(
        and(
          base,
          or(
            eq(pastoralCouncils.createdBy, userId),
            sql`exists (select 1 from pastoral_council_members pcm where pcm.council_id = ${pastoralCouncils.id} and pcm.user_id = ${userId})`,
          ),
        ),
      ),
  ]);
  return {
    all: all?.value ?? 0,
    planned: planned?.value ?? 0,
    held: held?.value ?? 0,
    cancelled: cancelled?.value ?? 0,
    mine: mine?.value ?? 0,
  };
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
