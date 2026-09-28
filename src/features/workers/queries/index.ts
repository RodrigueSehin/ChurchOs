import "server-only";
import { and, asc, count, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { ministries, ministryMembers, people, teamMembers, teams, workers } from "@/lib/db/schema";

export const WORKERS_PAGE_SIZE = 20;

const WORKER_STATUSES = ["active", "inactive", "on_leave", "archived"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function yearsAgoISO(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function yearStart(yearsAgo = 0): Date {
  const year = new Date().getUTCFullYear() - yearsAgo;
  return new Date(Date.UTC(year, 0, 1));
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export interface WorkerAffiliation {
  type: "team" | "ministry";
  id: string;
  name: string;
  role: string;
}

/** Un ouvrier n'a pas de lien direct vers une équipe/un ministère dans le schéma — dérivé de sa
 * plus récente affiliation active (`team_members`/`ministry_members`), équipe préférée à égalité
 * de date puisque `workers` sert d'abord de pivot pour `services`/`planning` (Phase 7). Purement
 * un affichage dérivé, jamais une nouvelle donnée stockée. */
async function getAffiliationsByPersonId(organizationId: string, personIds: string[]): Promise<Map<string, WorkerAffiliation>> {
  const map = new Map<string, WorkerAffiliation & { joinedAt: string }>();
  if (personIds.length === 0) return map;

  const [teamRows, ministryRows] = await Promise.all([
    db
      .select({ personId: teamMembers.personId, id: teams.id, name: teams.name, role: teamMembers.role, joinedAt: teamMembers.joinedAt })
      .from(teamMembers)
      .innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(and(eq(teamMembers.organizationId, organizationId), eq(teamMembers.status, "active"), inArray(teamMembers.personId, personIds))),
    db
      .select({ personId: ministryMembers.personId, id: ministries.id, name: ministries.name, role: ministryMembers.role, joinedAt: ministryMembers.joinedAt })
      .from(ministryMembers)
      .innerJoin(ministries, eq(ministries.id, ministryMembers.ministryId))
      .where(and(eq(ministryMembers.organizationId, organizationId), eq(ministryMembers.isActive, true), inArray(ministryMembers.personId, personIds))),
  ]);

  for (const r of teamRows) {
    const joinedAt = r.joinedAt ?? "";
    const existing = map.get(r.personId);
    if (!existing || joinedAt > existing.joinedAt) map.set(r.personId, { type: "team", id: r.id, name: r.name, role: r.role, joinedAt });
  }
  for (const r of ministryRows) {
    const joinedAt = r.joinedAt ?? "";
    const existing = map.get(r.personId);
    if (!existing || joinedAt > existing.joinedAt) map.set(r.personId, { type: "ministry", id: r.id, name: r.name, role: r.role, joinedAt });
  }

  return map;
}

/** `affiliation` vient de l'URL (`team:<uuid>` ou `ministry:<uuid>`) — un id non-uuid planterait
 * Postgres via `eq()` sur une colonne uuid (même leçon que `/members?ministryId=...`), d'où la
 * validation avant toute requête. */
async function resolvePersonIdsForAffiliation(organizationId: string, affiliation: string): Promise<string[] | null> {
  const [type, id] = affiliation.split(":");
  if (!id || !UUID_RE.test(id)) return null;

  if (type === "team") {
    const rows = await db
      .select({ personId: teamMembers.personId })
      .from(teamMembers)
      .where(and(eq(teamMembers.organizationId, organizationId), eq(teamMembers.teamId, id), eq(teamMembers.status, "active")));
    return rows.map((r) => r.personId);
  }
  if (type === "ministry") {
    const rows = await db
      .select({ personId: ministryMembers.personId })
      .from(ministryMembers)
      .where(and(eq(ministryMembers.organizationId, organizationId), eq(ministryMembers.ministryId, id), eq(ministryMembers.isActive, true)));
    return rows.map((r) => r.personId);
  }
  return null;
}

export interface WorkersListParams {
  organizationId: string;
  search?: string;
  status?: string;
  affiliation?: string;
  page?: number;
}

export async function getWorkers({ organizationId, search, status, affiliation, page = 1 }: WorkersListParams) {
  const conditions = [eq(workers.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(workers.workerNumber, term))!);
  }
  if (status && (WORKER_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(workers.status, status as (typeof WORKER_STATUSES)[number]));
  }
  if (affiliation) {
    const personIds = await resolvePersonIdsForAffiliation(organizationId, affiliation);
    if (personIds === null || personIds.length === 0) {
      return { rows: [], total: 0, page, pageSize: WORKERS_PAGE_SIZE };
    }
    conditions.push(inArray(workers.personId, personIds));
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: workers.id,
        personId: workers.personId,
        workerNumber: workers.workerNumber,
        status: workers.status,
        skills: workers.skills,
        notes: workers.notes,
        createdAt: workers.createdAt,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        phone: people.phone,
        photoUrl: people.photoUrl,
      })
      .from(workers)
      .innerJoin(people, eq(people.id, workers.personId))
      .where(where)
      .orderBy(asc(people.firstName))
      .limit(WORKERS_PAGE_SIZE)
      .offset((page - 1) * WORKERS_PAGE_SIZE),
    db.select({ value: count() }).from(workers).innerJoin(people, eq(people.id, workers.personId)).where(where),
  ]);

  const affiliationByPersonId = await getAffiliationsByPersonId(organizationId, rows.map((r) => r.personId));

  return {
    rows: rows.map((r) => ({ ...r, affiliation: affiliationByPersonId.get(r.personId) ?? null })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: WORKERS_PAGE_SIZE,
  };
}

/** Ouvriers actifs, pour peupler les sélecteurs d'affectation (services, planning). */
export async function getActiveWorkersForSelect(organizationId: string) {
  const rows = await db
    .select({ id: workers.id, firstName: people.firstName, lastName: people.lastName })
    .from(workers)
    .innerJoin(people, eq(people.id, workers.personId))
    .where(and(eq(workers.organizationId, organizationId), eq(workers.status, "active")))
    .orderBy(asc(people.firstName));
  return rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}` }));
}

export async function getWorkersTabCounts(organizationId: string) {
  const [[all], perStatus] = await Promise.all([
    db.select({ value: count() }).from(workers).where(eq(workers.organizationId, organizationId)),
    db.select({ status: workers.status, value: count() }).from(workers).where(eq(workers.organizationId, organizationId)).groupBy(workers.status),
  ]);
  const byStatus = new Map(perStatus.map((r) => [r.status, r.value]));
  return {
    all: all?.value ?? 0,
    active: byStatus.get("active") ?? 0,
    inactive: byStatus.get("inactive") ?? 0,
    on_leave: byStatus.get("on_leave") ?? 0,
    archived: byStatus.get("archived") ?? 0,
  };
}

/** Toutes les équipes + tous les ministères de l'organisation (pas seulement ceux qui ont déjà un
 * ouvrier) — sert le filtre ; le widget "Répartition" ci-dessous, lui, ne montre que ceux qui ont
 * réellement au moins un ouvrier. */
export async function getWorkerAffiliationOptions(organizationId: string) {
  const [teamRows, ministryRows] = await Promise.all([
    db.select({ id: teams.id, name: teams.name }).from(teams).where(eq(teams.organizationId, organizationId)).orderBy(asc(teams.name)),
    db.select({ id: ministries.id, name: ministries.name }).from(ministries).where(eq(ministries.organizationId, organizationId)).orderBy(asc(ministries.name)),
  ]);
  return [
    ...teamRows.map((t) => ({ value: `team:${t.id}`, label: t.name })),
    ...ministryRows.map((m) => ({ value: `ministry:${m.id}`, label: m.name })),
  ];
}

export async function getWorkerAffiliationStats(organizationId: string) {
  const activeWorkers = await db
    .select({ personId: workers.personId })
    .from(workers)
    .where(and(eq(workers.organizationId, organizationId), ne(workers.status, "archived")));
  const personIds = activeWorkers.map((w) => w.personId);
  const affiliationByPersonId = await getAffiliationsByPersonId(organizationId, personIds);

  const counts = new Map<string, { name: string; value: number }>();
  for (const personId of personIds) {
    const aff = affiliationByPersonId.get(personId);
    if (!aff) continue;
    const key = `${aff.type}:${aff.id}`;
    counts.set(key, { name: aff.name, value: (counts.get(key)?.value ?? 0) + 1 });
  }
  return [...counts.values()].sort((a, b) => b.value - a.value);
}

/** 4 cartes KPI de la maquette — toutes réelles, périodes de comparaison reproduites telles
 * quelles ("vs année dernière" pour les deux premières, "cette année" pour la troisième, "vs mois
 * dernier" pour la quatrième). "Équipes / Services" = nombre d'équipes réelles (`teams`) ; il
 * n'existe pas de second dénombrement "services" distinct pertinent ici. */
export async function getWorkersKpis(organizationId: string) {
  const cutoffYear = yearsAgoISO(1);
  const cutoff30 = daysAgoISO(30);
  const thisYearStart = yearStart(0).toISOString().slice(0, 10);
  const lastYearStart = yearStart(1).toISOString().slice(0, 10);

  const [
    [activeNow],
    [activeBefore],
    [teamsNow],
    [teamsBefore],
    [newThisYear],
    [newLastYear],
    [unassignedNow],
    [unassignedBefore],
  ] = await Promise.all([
    db.select({ value: count() }).from(workers).where(and(eq(workers.organizationId, organizationId), eq(workers.status, "active"))),
    db
      .select({ value: count() })
      .from(workers)
      .where(and(eq(workers.organizationId, organizationId), eq(workers.status, "active"), sql`${workers.createdAt}::date <= ${cutoffYear}`)),
    db.select({ value: count() }).from(teams).where(eq(teams.organizationId, organizationId)),
    db.select({ value: count() }).from(teams).where(and(eq(teams.organizationId, organizationId), sql`${teams.createdAt}::date <= ${cutoffYear}`)),
    db.select({ value: count() }).from(workers).where(and(eq(workers.organizationId, organizationId), sql`${workers.createdAt}::date >= ${thisYearStart}`)),
    db
      .select({ value: count() })
      .from(workers)
      .where(
        and(
          eq(workers.organizationId, organizationId),
          sql`${workers.createdAt}::date >= ${lastYearStart}`,
          sql`${workers.createdAt}::date < ${thisYearStart}`,
        ),
      ),
    db
      .select({ value: count() })
      .from(workers)
      .where(
        and(
          eq(workers.organizationId, organizationId),
          ne(workers.status, "archived"),
          sql`not exists (select 1 from ${teamMembers} where ${teamMembers.personId} = ${workers.personId} and ${teamMembers.organizationId} = ${organizationId} and ${teamMembers.status} = 'active')`,
          sql`not exists (select 1 from ${ministryMembers} where ${ministryMembers.personId} = ${workers.personId} and ${ministryMembers.organizationId} = ${organizationId} and ${ministryMembers.isActive} = true)`,
        ),
      ),
    db
      .select({ value: count() })
      .from(workers)
      .where(
        and(
          eq(workers.organizationId, organizationId),
          ne(workers.status, "archived"),
          sql`${workers.createdAt}::date <= ${cutoff30}`,
          sql`not exists (select 1 from ${teamMembers} where ${teamMembers.personId} = ${workers.personId} and ${teamMembers.organizationId} = ${organizationId} and ${teamMembers.status} = 'active' and coalesce(${teamMembers.joinedAt}, ${teamMembers.createdAt}::date) <= ${cutoff30})`,
          sql`not exists (select 1 from ${ministryMembers} where ${ministryMembers.personId} = ${workers.personId} and ${ministryMembers.organizationId} = ${organizationId} and ${ministryMembers.isActive} = true and coalesce(${ministryMembers.joinedAt}, ${ministryMembers.createdAt}::date) <= ${cutoff30})`,
        ),
      ),
  ]);

  return {
    active: { value: activeNow?.value ?? 0, deltaPct: pctDelta(activeNow?.value ?? 0, activeBefore?.value ?? 0) },
    teams: { value: teamsNow?.value ?? 0, deltaPct: pctDelta(teamsNow?.value ?? 0, teamsBefore?.value ?? 0) },
    newThisYear: { value: newThisYear?.value ?? 0, deltaPct: pctDelta(newThisYear?.value ?? 0, newLastYear?.value ?? 0) },
    unassigned: { value: unassignedNow?.value ?? 0, deltaPct: pctDelta(unassignedNow?.value ?? 0, unassignedBefore?.value ?? 0) },
  };
}
