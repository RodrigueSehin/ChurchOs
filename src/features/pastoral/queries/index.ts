import "server-only";
import { and, count, countDistinct, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { authUsers, pastoralFollowups, pastoralNotes, people } from "@/lib/db/schema";
import { confidentialBooleanFilter, confidentialityLevelFilter, type ConfidentialityContext } from "@/lib/rbac/confidentiality";

export const PASTORAL_PAGE_SIZE = 20;

export interface PastoralFollowupsParams {
  organizationId: string;
  ctx: ConfidentialityContext;
  search?: string;
  status?: string;
  priority?: string;
  /** Onglet de raccourci — `"toVisit"`/`"active"`/`"sensitive"`/`"stale"`, voir `getPastoralTabCounts`. */
  view?: string;
  assignedToUserId?: string;
  page?: number;
}

export async function getPastoralFollowups({ organizationId, ctx, search, status, priority, view, assignedToUserId, page = 1 }: PastoralFollowupsParams) {
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
  if (priority) {
    conditions.push(eq(pastoralFollowups.priority, priority as (typeof pastoralFollowups.priority.enumValues)[number]));
  }
  if (assignedToUserId) conditions.push(eq(pastoralFollowups.assignedToUserId, assignedToUserId));
  const cutoff30 = daysAgoISO(30);
  if (view === "toVisit") conditions.push(eq(pastoralFollowups.status, "new"));
  else if (view === "active") conditions.push(sql`${pastoralFollowups.status} in ('new','in_progress','waiting')`);
  else if (view === "sensitive") conditions.push(eq(pastoralFollowups.confidentiality, "restricted"));
  else if (view === "stale") {
    conditions.push(sql`${pastoralFollowups.status} in ('new','in_progress','waiting')`);
    conditions.push(sql`${pastoralFollowups.updatedAt}::date <= ${cutoff30}`);
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
        updatedAt: pastoralFollowups.updatedAt,
        personFirstName: people.firstName,
        personLastName: people.lastName,
        assignedToEmail: authUsers.email,
      })
      .from(pastoralFollowups)
      .innerJoin(people, eq(people.id, pastoralFollowups.personId))
      .leftJoin(authUsers, eq(authUsers.id, pastoralFollowups.assignedToUserId))
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

/** Comptage par statut (pas les enregistrements eux-mêmes) — utilisé par l'assistant ChurchOS AI
 * (Phase 15) pour répondre à des questions de suivi pastoral sans jamais exposer plus qu'un
 * compte agrégé. Le filtre de confidentialité s'applique quand même : un suivi `restricted` non
 * accessible à l'appelant ne doit pas non plus être compté. */
export async function getPastoralStatusSummary(organizationId: string, ctx: ConfidentialityContext) {
  const rows = await db
    .select({ status: pastoralFollowups.status, value: count() })
    .from(pastoralFollowups)
    .where(
      and(
        eq(pastoralFollowups.organizationId, organizationId),
        confidentialityLevelFilter(ctx, pastoralFollowups.confidentiality, pastoralFollowups.createdBy, pastoralFollowups.assignedToUserId),
      ),
    )
    .groupBy(pastoralFollowups.status);
  return rows;
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/** 5 cartes KPI de la page Suivi pastoral — toutes filtrées par confidentialité (jamais de
 * comptage brut qui contournerait `confidentialityLevelFilter`, même agrégé). */
export async function getPastoralKpis(organizationId: string, ctx: ConfidentialityContext) {
  const cutoff30 = daysAgoISO(30);
  const confFilter = confidentialityLevelFilter(ctx, pastoralFollowups.confidentiality, pastoralFollowups.createdBy, pastoralFollowups.assignedToUserId);

  const [[membersNow], [membersBefore], [sensitiveNow], [sensitiveBefore], [inProgress]] = await Promise.all([
    db
      .select({ value: countDistinct(pastoralFollowups.personId) })
      .from(pastoralFollowups)
      .where(and(eq(pastoralFollowups.organizationId, organizationId), confFilter)),
    db
      .select({ value: countDistinct(pastoralFollowups.personId) })
      .from(pastoralFollowups)
      .where(and(eq(pastoralFollowups.organizationId, organizationId), confFilter, sql`${pastoralFollowups.createdAt}::date <= ${cutoff30}`)),
    db
      .select({ value: count() })
      .from(pastoralFollowups)
      .where(and(eq(pastoralFollowups.organizationId, organizationId), confFilter, eq(pastoralFollowups.confidentiality, "restricted"))),
    db
      .select({ value: count() })
      .from(pastoralFollowups)
      .where(
        and(
          eq(pastoralFollowups.organizationId, organizationId),
          confFilter,
          eq(pastoralFollowups.confidentiality, "restricted"),
          sql`${pastoralFollowups.createdAt}::date <= ${cutoff30}`,
        ),
      ),
    db
      .select({ value: count() })
      .from(pastoralFollowups)
      .where(and(eq(pastoralFollowups.organizationId, organizationId), confFilter, eq(pastoralFollowups.status, "in_progress"))),
  ]);

  return {
    membersFollowed: { value: membersNow?.value ?? 0, deltaPct: pctDelta(membersNow?.value ?? 0, membersBefore?.value ?? 0) },
    sensitive: { value: sensitiveNow?.value ?? 0, deltaPct: pctDelta(sensitiveNow?.value ?? 0, sensitiveBefore?.value ?? 0) },
    inProgress: inProgress?.value ?? 0,
  };
}

/** Comptages pour les onglets de raccourci — "À visiter" = `new` (pas encore démarré), "Suivis
 * actifs" = new/in_progress/waiting, "Sans activité" = pas mis à jour depuis 30 jours (parmi les
 * suivis actifs, sinon un suivi terminé depuis longtemps compterait à tort comme "sans activité"). */
export async function getPastoralTabCounts(organizationId: string, ctx: ConfidentialityContext) {
  const cutoff30 = daysAgoISO(30);
  const confFilter = confidentialityLevelFilter(ctx, pastoralFollowups.confidentiality, pastoralFollowups.createdBy, pastoralFollowups.assignedToUserId);
  const base = and(eq(pastoralFollowups.organizationId, organizationId), confFilter);

  const [[all], [toVisit], [active], [sensitive], [stale]] = await Promise.all([
    db.select({ value: count() }).from(pastoralFollowups).where(base),
    db.select({ value: count() }).from(pastoralFollowups).where(and(base, eq(pastoralFollowups.status, "new"))),
    db.select({ value: count() }).from(pastoralFollowups).where(and(base, sql`${pastoralFollowups.status} in ('new','in_progress','waiting')`)),
    db.select({ value: count() }).from(pastoralFollowups).where(and(base, eq(pastoralFollowups.confidentiality, "restricted"))),
    db
      .select({ value: count() })
      .from(pastoralFollowups)
      .where(
        and(
          base,
          sql`${pastoralFollowups.status} in ('new','in_progress','waiting')`,
          sql`${pastoralFollowups.updatedAt}::date <= ${cutoff30}`,
        ),
      ),
  ]);

  return {
    all: all?.value ?? 0,
    toVisit: toVisit?.value ?? 0,
    active: active?.value ?? 0,
    sensitive: sensitive?.value ?? 0,
    stale: stale?.value ?? 0,
  };
}

export { getAssignableMembers as getAssignableUsers } from "@/features/rbac/services";
