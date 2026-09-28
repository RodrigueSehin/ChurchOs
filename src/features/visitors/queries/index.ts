import "server-only";
import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, visitors } from "@/lib/db/schema";

export const VISITORS_PAGE_SIZE = 20;

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

/** Utilisée par le tableau de bord et la page Membres (carte KPI "Visiteurs") — voir la règle de
 * façade cross-module dans 01-project-structure.md. */
export async function getVisitorsKpi(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const [[now], [before]] = await Promise.all([
    db.select({ value: count() }).from(visitors).where(and(eq(visitors.organizationId, organizationId), ne(visitors.status, "archived"))),
    db
      .select({ value: count() })
      .from(visitors)
      .where(
        and(
          eq(visitors.organizationId, organizationId),
          ne(visitors.status, "archived"),
          sql`${visitors.createdAt}::date <= ${cutoff30}`,
        ),
      ),
  ]);
  const nowValue = now?.value ?? 0;
  const beforeValue = before?.value ?? 0;
  const deltaPct = beforeValue <= 0 ? (nowValue > 0 ? 100 : 0) : Math.round(((nowValue - beforeValue) / beforeValue) * 100);
  return { value: nowValue, deltaPct };
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

async function statusCountNowAndBefore(organizationId: string, status: (typeof visitors.status.enumValues)[number]) {
  const cutoff30 = daysAgoISO(30);
  const [[now], [before]] = await Promise.all([
    db.select({ value: count() }).from(visitors).where(and(eq(visitors.organizationId, organizationId), eq(visitors.status, status))),
    db
      .select({ value: count() })
      .from(visitors)
      .where(and(eq(visitors.organizationId, organizationId), eq(visitors.status, status), sql`${visitors.createdAt}::date <= ${cutoff30}`)),
  ]);
  return { value: now?.value ?? 0, deltaPct: pctDelta(now?.value ?? 0, before?.value ?? 0) };
}

/** Cartes KPI 2 à 4 de la maquette — statuts réels du schéma (voir `VISITOR_STATUS_LABELS`) :
 * "Premières visites" = `new`, "Visites répétées" = `contacted`, "En cours de suivi" =
 * `follow_up`. Comparaison "vs mois dernier" en instantané à 30 jours, même approximation que le
 * reste de l'app pour un champ mutable (le statut a pu changer depuis). */
export async function getVisitorsStatusKpis(organizationId: string) {
  const [firstVisit, repeat, followUp] = await Promise.all([
    statusCountNowAndBefore(organizationId, "new"),
    statusCountNowAndBefore(organizationId, "contacted"),
    statusCountNowAndBefore(organizationId, "follow_up"),
  ]);
  return { firstVisit, repeat, followUp };
}

/** "Convertis en membres" — la maquette le compare "ce mois-ci" (pas "vs mois dernier" comme les
 * trois autres) : compte les conversions par mois via `updated_at` (pas de colonne
 * `converted_at` dédiée — `convertVisitorToMember` met à jour `visitors.status` et
 * `updated_at` se mit à jour automatiquement au même moment, seule approximation disponible). */
export async function getVisitorsConvertedKpi(organizationId: string) {
  const thisMonthStart = monthStartISO(0);
  const nextMonthStart = monthStartISO(1);
  const lastMonthStart = monthStartISO(-1);
  const [[thisMonth], [lastMonth]] = await Promise.all([
    db
      .select({ value: count() })
      .from(visitors)
      .where(
        and(
          eq(visitors.organizationId, organizationId),
          eq(visitors.status, "converted"),
          sql`${visitors.updatedAt}::date >= ${thisMonthStart} and ${visitors.updatedAt}::date < ${nextMonthStart}`,
        ),
      ),
    db
      .select({ value: count() })
      .from(visitors)
      .where(
        and(
          eq(visitors.organizationId, organizationId),
          eq(visitors.status, "converted"),
          sql`${visitors.updatedAt}::date >= ${lastMonthStart} and ${visitors.updatedAt}::date < ${thisMonthStart}`,
        ),
      ),
  ]);
  return { value: thisMonth?.value ?? 0, deltaPct: pctDelta(thisMonth?.value ?? 0, lastMonth?.value ?? 0) };
}

/** Comptages pour les onglets de raccourci — mêmes 4 statuts que les cartes KPI. */
export async function getVisitorsTabCounts(organizationId: string) {
  const [[all], firstVisit, repeat, followUp, [converted]] = await Promise.all([
    db.select({ value: count() }).from(visitors).where(and(eq(visitors.organizationId, organizationId), ne(visitors.status, "archived"))),
    statusCountNowAndBefore(organizationId, "new"),
    statusCountNowAndBefore(organizationId, "contacted"),
    statusCountNowAndBefore(organizationId, "follow_up"),
    db.select({ value: count() }).from(visitors).where(and(eq(visitors.organizationId, organizationId), eq(visitors.status, "converted"))),
  ]);
  return {
    all: all?.value ?? 0,
    new: firstVisit.value,
    contacted: repeat.value,
    follow_up: followUp.value,
    converted: converted?.value ?? 0,
  };
}

export async function getVisitorSources(organizationId: string) {
  const rows = await db
    .selectDistinct({ source: visitors.source })
    .from(visitors)
    .where(and(eq(visitors.organizationId, organizationId), sql`${visitors.source} is not null and ${visitors.source} != ''`));
  return rows.map((r) => r.source as string).sort();
}

export interface VisitorsListParams {
  organizationId: string;
  search?: string;
  status?: string;
  source?: string;
  page?: number;
}

export async function getVisitors({ organizationId, search, status, source, page = 1 }: VisitorsListParams) {
  const conditions = [eq(people.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(people.phone, term))!);
  }
  if (status && (visitors.status.enumValues as readonly string[]).includes(status)) {
    conditions.push(eq(visitors.status, status as (typeof visitors.status.enumValues)[number]));
  }
  if (source) conditions.push(eq(visitors.source, source));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        visitorId: visitors.id,
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        phone: people.phone,
        photoUrl: people.photoUrl,
        status: visitors.status,
        firstVisitDate: visitors.firstVisitDate,
        followUpDate: visitors.followUpDate,
        source: visitors.source,
        lastEventTitle: sql<string | null>`(
          select e.title from event_registrations er
          join events e on e.id = er.event_id
          where er.person_id = ${people.id}
          order by er.registered_at desc
          limit 1
        )`,
      })
      .from(visitors)
      .innerJoin(people, eq(people.id, visitors.personId))
      .where(where)
      .orderBy(desc(visitors.firstVisitDate))
      .limit(VISITORS_PAGE_SIZE)
      .offset((page - 1) * VISITORS_PAGE_SIZE),
    db.select({ value: count() }).from(visitors).innerJoin(people, eq(people.id, visitors.personId)).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: VISITORS_PAGE_SIZE };
}

export async function getVisitorDetail(organizationId: string, visitorId: string) {
  const [row] = await db
    .select({ visitor: visitors, person: people })
    .from(visitors)
    .innerJoin(people, eq(people.id, visitors.personId))
    .where(and(eq(visitors.id, visitorId), eq(visitors.organizationId, organizationId)));
  return row ?? null;
}
