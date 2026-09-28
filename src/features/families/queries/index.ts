import "server-only";
import { and, asc, count, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { familyMembers, families, people } from "@/lib/db/schema";

export const FAMILIES_PAGE_SIZE = 20;

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

/** Utilisée par le tableau de bord et la page Membres (carte KPI "Familles") — voir la règle de
 * façade cross-module dans 01-project-structure.md. */
export async function getFamiliesKpi(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const [[now], [before]] = await Promise.all([
    db.select({ value: count() }).from(families).where(eq(families.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(families)
      .where(and(eq(families.organizationId, organizationId), sql`${families.createdAt}::date <= ${cutoff30}`)),
  ]);
  const nowValue = now?.value ?? 0;
  const beforeValue = before?.value ?? 0;
  const deltaPct = beforeValue <= 0 ? (nowValue > 0 ? 100 : 0) : Math.round(((nowValue - beforeValue) / beforeValue) * 100);
  return { value: nowValue, deltaPct };
}

/** "Membres"/"Adultes"/"Enfants" au sens de cette page = personnes rattachées à une famille (pas
 * l'ensemble des membres de l'église, un membre peut ne pas être rattaché à une famille) — 18 ans
 * est le seuil enfant/adulte utilisé ici (différent des 4 tranches du tableau de bord, une
 * granularité différente pour un besoin différent). */
export async function getFamiliesMemberKpis(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const monthStart = monthStartISO(0);

  const [[nowRow], [beforeRow], [newFamiliesRow]] = await Promise.all([
    db
      .select({
        total: count(),
        adults: sql<number>`count(*) filter (where date_part('year', age(current_date, ${people.birthDate})) >= 18 or ${people.birthDate} is null)`,
        children: sql<number>`count(*) filter (where date_part('year', age(current_date, ${people.birthDate})) < 18)`,
      })
      .from(familyMembers)
      .innerJoin(people, eq(people.id, familyMembers.personId))
      .where(eq(familyMembers.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(familyMembers)
      .where(and(eq(familyMembers.organizationId, organizationId), sql`${familyMembers.createdAt}::date <= ${cutoff30}`)),
    db
      .select({ value: count() })
      .from(families)
      .where(and(eq(families.organizationId, organizationId), sql`${families.createdAt}::date >= ${monthStart}`)),
  ]);

  const membersNow = nowRow?.total ?? 0;
  const membersBefore = beforeRow?.value ?? 0;
  const membersDeltaPct = membersBefore <= 0 ? (membersNow > 0 ? 100 : 0) : Math.round(((membersNow - membersBefore) / membersBefore) * 100);

  return {
    members: membersNow,
    membersDeltaPct,
    adults: Number(nowRow?.adults ?? 0),
    children: Number(nowRow?.children ?? 0),
    newFamilies: newFamiliesRow?.value ?? 0,
  };
}

/** Comptages pour les onglets — "Suivi pastoral" = au moins un membre de la famille a un suivi
 * pastoral non terminé ; "Sans visite" = aucun membre n'a jamais eu de visite enregistrée. Aucune
 * des deux n'est une colonne stockée : dérivées des vraies tables `pastoral_followups`/`visits`. */
export async function getFamiliesTabCounts(organizationId: string) {
  const monthStart = monthStartISO(0);
  const [[all], [newThisMonth], [pastoral], [noVisit]] = await Promise.all([
    db.select({ value: count() }).from(families).where(eq(families.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(families)
      .where(and(eq(families.organizationId, organizationId), sql`${families.createdAt}::date >= ${monthStart}`)),
    db
      .select({ value: count() })
      .from(families)
      .where(
        and(
          eq(families.organizationId, organizationId),
          sql`exists (
            select 1 from family_members fm
            join pastoral_followups pf on pf.person_id = fm.person_id
            where fm.family_id = ${families.id} and pf.status not in ('completed','cancelled','archived')
          )`,
        ),
      ),
    db
      .select({ value: count() })
      .from(families)
      .where(
        and(
          eq(families.organizationId, organizationId),
          sql`not exists (
            select 1 from family_members fm
            join visits v on v.person_id = fm.person_id
            where fm.family_id = ${families.id}
          )`,
        ),
      ),
  ]);

  return {
    all: all?.value ?? 0,
    new: newThisMonth?.value ?? 0,
    pastoral: pastoral?.value ?? 0,
    noVisit: noVisit?.value ?? 0,
  };
}

export async function getFamilyCities(organizationId: string) {
  const rows = await db
    .selectDistinct({ city: families.city })
    .from(families)
    .where(and(eq(families.organizationId, organizationId), sql`${families.city} is not null and ${families.city} != ''`))
    .orderBy(asc(families.city));
  return rows.map((r) => r.city as string);
}

const SIZE_BUCKETS = ["small", "medium", "large"] as const;

export interface FamiliesListParams {
  organizationId: string;
  search?: string;
  /** `"new"`/`"pastoral"`/`"noVisit"` — pas des colonnes, voir `getFamiliesTabCounts`. */
  view?: string;
  city?: string;
  size?: string;
  ministryId?: string;
  page?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getFamilies({ organizationId, search, view, city, size, ministryId, page = 1 }: FamiliesListParams) {
  const conditions = [eq(families.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(families.name, `%${search.trim()}%`));
  if (view === "new") {
    conditions.push(sql`${families.createdAt}::date >= ${monthStartISO(0)}`);
  } else if (view === "pastoral") {
    conditions.push(
      sql`exists (
        select 1 from family_members fm
        join pastoral_followups pf on pf.person_id = fm.person_id
        where fm.family_id = ${families.id} and pf.status not in ('completed','cancelled','archived')
      )`,
    );
  } else if (view === "noVisit") {
    conditions.push(
      sql`not exists (
        select 1 from family_members fm
        join visits v on v.person_id = fm.person_id
        where fm.family_id = ${families.id}
      )`,
    );
  }
  if (city) conditions.push(eq(families.city, city));
  if (ministryId && UUID_RE.test(ministryId)) {
    conditions.push(
      sql`exists (
        select 1 from family_members fm
        join ministry_members mm on mm.person_id = fm.person_id
        where fm.family_id = ${families.id} and mm.ministry_id = ${ministryId} and mm.is_active = true
      )`,
    );
  }
  if (size && SIZE_BUCKETS.includes(size as (typeof SIZE_BUCKETS)[number])) {
    const sizeExpr = sql`(select count(*) from family_members fm where fm.family_id = ${families.id})`;
    if (size === "small") conditions.push(sql`${sizeExpr} <= 2`);
    else if (size === "medium") conditions.push(sql`${sizeExpr} between 3 and 4`);
    else conditions.push(sql`${sizeExpr} >= 5`);
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: families.id,
        name: families.name,
        city: families.city,
        primaryContactFirstName: people.firstName,
        primaryContactLastName: people.lastName,
        primaryContactPhone: people.phone,
        hasActivePastoral: sql<boolean>`exists (
          select 1 from family_members fm
          join pastoral_followups pf on pf.person_id = fm.person_id
          where fm.family_id = ${families.id} and pf.status not in ('completed','cancelled','archived')
        )`,
        lastVisitAt: sql<string | null>`(
          select max(coalesce(v.completed_at, v.scheduled_at, v.created_at))
          from family_members fm
          join visits v on v.person_id = fm.person_id
          where fm.family_id = ${families.id}
        )`,
      })
      .from(families)
      .leftJoin(people, eq(people.id, families.primaryContactPersonId))
      .where(where)
      .orderBy(asc(families.name))
      .limit(FAMILIES_PAGE_SIZE)
      .offset((page - 1) * FAMILIES_PAGE_SIZE),
    db.select({ value: count() }).from(families).where(where),
  ]);

  const familyIds = rows.map((r) => r.id);
  const [memberCounts, childCounts] = familyIds.length
    ? await Promise.all([
        db
          .select({ familyId: familyMembers.familyId, value: count() })
          .from(familyMembers)
          .where(eq(familyMembers.organizationId, organizationId))
          .groupBy(familyMembers.familyId),
        db
          .select({ familyId: familyMembers.familyId, value: count() })
          .from(familyMembers)
          .innerJoin(people, eq(people.id, familyMembers.personId))
          .where(
            and(eq(familyMembers.organizationId, organizationId), sql`date_part('year', age(current_date, ${people.birthDate})) < 18`),
          )
          .groupBy(familyMembers.familyId),
      ])
    : [[], []];
  const countByFamily = new Map(memberCounts.map((m) => [m.familyId, m.value]));
  const childCountByFamily = new Map(childCounts.map((m) => [m.familyId, m.value]));

  return {
    rows: rows.map((r) => ({
      ...r,
      memberCount: countByFamily.get(r.id) ?? 0,
      childrenCount: childCountByFamily.get(r.id) ?? 0,
      status: r.hasActivePastoral ? "pastoral" : !r.lastVisitAt ? "to_visit" : "active",
    })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: FAMILIES_PAGE_SIZE,
  };
}

export async function getFamilyDetail(organizationId: string, familyId: string) {
  const [family] = await db
    .select()
    .from(families)
    .where(and(eq(families.id, familyId), eq(families.organizationId, organizationId)));
  if (!family) return null;

  const members = await db
    .select({
      familyMemberId: familyMembers.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      phone: people.phone,
      relationshipToHead: familyMembers.relationshipToHead,
      isHead: familyMembers.isHead,
      isPrimaryContact: familyMembers.isPrimaryContact,
    })
    .from(familyMembers)
    .innerJoin(people, eq(people.id, familyMembers.personId))
    .where(eq(familyMembers.familyId, familyId))
    .orderBy(asc(people.firstName));

  return { family, members };
}
