import "server-only";
import { and, asc, count, countDistinct, desc, eq, ilike, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { ministries, ministryMembers, people } from "@/lib/db/schema";

export const MINISTRIES_PAGE_SIZE = 20;

const MINISTRY_STATUSES = ["active", "inactive", "archived"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function yearsAgoISO(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** `previous <= 0` évite une division par zéro, même règle que `features/dashboard/queries`. */
function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export interface MinistriesListParams {
  organizationId: string;
  search?: string;
  status?: string;
  category?: string;
  leaderPersonId?: string;
  page?: number;
}

export async function getMinistries({ organizationId, search, status, category, leaderPersonId, page = 1 }: MinistriesListParams) {
  const conditions = [eq(ministries.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(ministries.name, `%${search.trim()}%`));
  // Un filtre venu de l'URL est une entrée non fiable (lien partagé, favori obsolète, édition
  // manuelle) — valider contre l'enum réel avant `eq()` évite le 500 Postgres "invalid input value
  // for enum" vu sur `/members?ministryId=...` (même leçon, appliquée ici avant d'écrire le bug).
  if (status && (MINISTRY_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(ministries.status, status as (typeof MINISTRY_STATUSES)[number]));
  }
  if (category?.trim()) conditions.push(eq(ministries.category, category.trim()));
  if (leaderPersonId && UUID_RE.test(leaderPersonId)) conditions.push(eq(ministries.leaderPersonId, leaderPersonId));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: ministries.id,
        name: ministries.name,
        code: ministries.code,
        category: ministries.category,
        description: ministries.description,
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

/** 3 cartes KPI de la maquette (le "Projets en cours" de la maquette n'a aucune notion
 * correspondante dans le schéma — abandonné, décision utilisateur). Delta "vs année dernière"
 * (pas "vs mois dernier" comme ailleurs) — même mécanique que `features/dashboard/queries`, juste
 * un `cutoff` à 1 an au lieu de 30 jours. */
export async function getMinistriesKpis(organizationId: string) {
  const cutoff = yearsAgoISO(1);

  const [[ministriesNow], [ministriesBefore], [membersNow], [membersBefore]] = await Promise.all([
    db.select({ value: count() }).from(ministries).where(eq(ministries.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(ministries)
      .where(and(eq(ministries.organizationId, organizationId), sql`${ministries.createdAt}::date <= ${cutoff}`)),
    db
      .select({ value: countDistinct(ministryMembers.personId) })
      .from(ministryMembers)
      .where(and(eq(ministryMembers.organizationId, organizationId), eq(ministryMembers.isActive, true))),
    db
      .select({ value: countDistinct(ministryMembers.personId) })
      .from(ministryMembers)
      .where(
        and(
          eq(ministryMembers.organizationId, organizationId),
          eq(ministryMembers.isActive, true),
          sql`coalesce(${ministryMembers.joinedAt}, ${ministryMembers.createdAt}::date) <= ${cutoff}`,
        ),
      ),
  ]);

  return {
    ministries: { value: ministriesNow?.value ?? 0, deltaPct: pctDelta(ministriesNow?.value ?? 0, ministriesBefore?.value ?? 0) },
    membersInvolved: { value: membersNow?.value ?? 0, deltaPct: pctDelta(membersNow?.value ?? 0, membersBefore?.value ?? 0) },
  };
}

export async function getMinistriesTabCounts(organizationId: string) {
  const [[all], perStatus] = await Promise.all([
    db.select({ value: count() }).from(ministries).where(eq(ministries.organizationId, organizationId)),
    db
      .select({ status: ministries.status, value: count() })
      .from(ministries)
      .where(eq(ministries.organizationId, organizationId))
      .groupBy(ministries.status),
  ]);
  const byStatus = new Map(perStatus.map((r) => [r.status, r.value]));
  return {
    all: all?.value ?? 0,
    active: byStatus.get("active") ?? 0,
    inactive: byStatus.get("inactive") ?? 0,
    archived: byStatus.get("archived") ?? 0,
  };
}

/** Valeurs distinctes réellement saisies — pas une taxonomie figée inventée : la liste du filtre
 * grandit avec ce que les utilisateurs saisissent réellement dans le formulaire. */
export async function getMinistryCategories(organizationId: string) {
  const rows = await db
    .selectDistinct({ category: ministries.category })
    .from(ministries)
    .where(and(eq(ministries.organizationId, organizationId), isNotNull(ministries.category)));
  return rows.map((r) => r.category as string).sort((a, b) => a.localeCompare(b, "fr"));
}

export async function getMinistryCategoryStats(organizationId: string) {
  const rows = await db
    .select({ category: ministries.category, value: count() })
    .from(ministries)
    .where(and(eq(ministries.organizationId, organizationId), isNotNull(ministries.category)))
    .groupBy(ministries.category)
    .orderBy(desc(count()));
  return rows.map((r) => ({ category: r.category as string, value: r.value }));
}

export async function getMinistryLeadersForSelect(organizationId: string) {
  const rows = await db
    .selectDistinct({ id: people.id, firstName: people.firstName, lastName: people.lastName })
    .from(ministries)
    .innerJoin(people, eq(people.id, ministries.leaderPersonId))
    .where(eq(ministries.organizationId, organizationId))
    .orderBy(asc(people.firstName));
  return rows.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}` }));
}
