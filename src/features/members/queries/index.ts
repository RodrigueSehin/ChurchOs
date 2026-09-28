import "server-only";
import { and, asc, count, countDistinct, eq, gte, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { attendanceRecords, campuses, members, people } from "@/lib/db/schema";

export const MEMBERS_PAGE_SIZE = 20;

function monthStartISO(monthsOffset = 0): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + monthsOffset);
  return d.toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Correspond aux tranches d'âge affichées sur le tableau de bord (§ Répartition des membres) —
 * mêmes bornes, pour que "Groupe d'âge" veuille dire la même chose partout dans l'app. */
const AGE_GROUP_SQL = sql`case
  when date_part('year', age(current_date, ${people.birthDate})) < 13 then 'children'
  when date_part('year', age(current_date, ${people.birthDate})) < 26 then 'youth'
  when date_part('year', age(current_date, ${people.birthDate})) < 60 then 'adult'
  else 'senior' end`;

export interface MembersListParams {
  organizationId: string;
  search?: string;
  /** Une vraie valeur de `member_status`, ou le pseudo-statut `"new"` (adhésion ce mois-ci — pas
   * une colonne du schéma, traité spécialement ci-dessous). */
  status?: string;
  ministryId?: string;
  ageGroup?: string;
  gender?: string;
  page?: number;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AGE_GROUPS = ["children", "youth", "adult", "senior"];

export async function getMembers({ organizationId, search, status, ministryId, ageGroup, gender, page = 1 }: MembersListParams) {
  const conditions = [eq(people.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(ilike(people.firstName, term), ilike(people.lastName, term), ilike(people.email, term), ilike(people.phone, term))!,
    );
  }
  // Chaque filtre ci-dessous vient de `?query=` (jamais approuvé) — une valeur qui ne correspond
  // à aucune option réelle est silencieusement ignorée plutôt que de faire planter la requête
  // SQL (ex. un UUID malformé dans `ministryId` ferait échouer la comparaison `uuid = texte`).
  if (status === "new") {
    conditions.push(sql`coalesce(${members.membershipDate}, ${members.createdAt}::date) >= ${monthStartISO(0)}`);
  } else if (status && (members.status.enumValues as readonly string[]).includes(status)) {
    conditions.push(eq(members.status, status as (typeof members.status.enumValues)[number]));
  }
  if (gender && (people.gender.enumValues as readonly string[]).includes(gender)) {
    conditions.push(eq(people.gender, gender as (typeof people.gender.enumValues)[number]));
  }
  if (ageGroup && AGE_GROUPS.includes(ageGroup)) {
    conditions.push(sql`${AGE_GROUP_SQL} = ${ageGroup}`);
  }
  if (ministryId && UUID_RE.test(ministryId)) {
    conditions.push(
      sql`exists (select 1 from ministry_members mm where mm.person_id = ${people.id} and mm.ministry_id = ${ministryId} and mm.is_active = true)`,
    );
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
        gender: people.gender,
        birthDate: people.birthDate,
        status: members.status,
        membershipDate: members.membershipDate,
        campusName: campuses.name,
        ministryName: sql<string | null>`(
          select m.name from ministry_members mm
          join ministries m on m.id = mm.ministry_id
          where mm.person_id = ${people.id} and mm.is_active = true
          order by mm.joined_at desc nulls last
          limit 1
        )`,
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

/** Liste complète (non paginée) pour l'export de rapports (`features/reports`) — jamais utilisée
 * pour une page de liste normale, où `getMembers` (paginée) reste la bonne fonction. */
export async function getAllMembersForExport(organizationId: string) {
  return db
    .select({
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      phone: people.phone,
      status: members.status,
      membershipDate: members.membershipDate,
      campusName: campuses.name,
    })
    .from(members)
    .innerJoin(people, eq(people.id, members.personId))
    .leftJoin(campuses, eq(campuses.id, people.campusId))
    .where(eq(people.organizationId, organizationId))
    .orderBy(asc(people.lastName), asc(people.firstName));
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

/** Comptages pour les onglets de raccourci au-dessus du tableau ("Tous les membres (482)",
 * "Nouveaux (12)", ...) — indépendants du filtre `status` couramment appliqué, pour que chaque
 * onglet affiche toujours son propre total. */
export async function getMemberTabCounts(organizationId: string) {
  const monthStart = monthStartISO(0);
  const [[all], [newThisMonth], [transferred], [inactive]] = await Promise.all([
    db.select({ value: count() }).from(members).innerJoin(people, eq(people.id, members.personId)).where(eq(people.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(members)
      .innerJoin(people, eq(people.id, members.personId))
      .where(
        and(
          eq(people.organizationId, organizationId),
          sql`coalesce(${members.membershipDate}, ${members.createdAt}::date) >= ${monthStart}`,
        ),
      ),
    db
      .select({ value: count() })
      .from(members)
      .innerJoin(people, eq(people.id, members.personId))
      .where(and(eq(people.organizationId, organizationId), eq(members.status, "transferred"))),
    db
      .select({ value: count() })
      .from(members)
      .innerJoin(people, eq(people.id, members.personId))
      .where(and(eq(people.organizationId, organizationId), eq(members.status, "inactive"))),
  ]);

  return {
    all: all?.value ?? 0,
    new: newThisMonth?.value ?? 0,
    transferred: transferred?.value ?? 0,
    inactive: inactive?.value ?? 0,
  };
}

export async function getMembersKpi(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const [[now], [before]] = await Promise.all([
    db.select({ value: count() }).from(members).where(and(eq(members.organizationId, organizationId), eq(members.status, "active"))),
    db
      .select({ value: count() })
      .from(members)
      .where(
        and(
          eq(members.organizationId, organizationId),
          eq(members.status, "active"),
          sql`coalesce(${members.membershipDate}, ${members.createdAt}::date) <= ${cutoff30}`,
        ),
      ),
  ]);
  const nowValue = now?.value ?? 0;
  const beforeValue = before?.value ?? 0;
  const deltaPct = beforeValue <= 0 ? (nowValue > 0 ? 100 : 0) : Math.round(((nowValue - beforeValue) / beforeValue) * 100);
  return { value: nowValue, deltaPct };
}

export async function getNewMembersThisMonthCount(organizationId: string) {
  const monthStart = monthStartISO(0);
  const [row] = await db
    .select({ value: count() })
    .from(members)
    .where(
      and(
        eq(members.organizationId, organizationId),
        sql`coalesce(${members.membershipDate}, ${members.createdAt}::date) >= ${monthStart}`,
      ),
    );
  return row?.value ?? 0;
}

/** "Membres actifs" au sens engagement réel (au moins une présence enregistrée ces 30 derniers
 * jours), pas au sens `member_status = 'active'` (déjà couvert par la carte "Membres") — une
 * définition différente et complémentaire, gardée distincte pour rester une donnée réelle et pas
 * un doublon relabellisé. Réservé à l'appelant : agrège `attendance_records`, gaté sur
 * `attendance.view` là où la fonction est appelée. */
export async function getActiveEngagedMembersCount(organizationId: string) {
  const cutoff30 = daysAgoISO(30);
  const [row] = await db
    .select({ value: countDistinct(attendanceRecords.personId) })
    .from(attendanceRecords)
    .innerJoin(members, eq(members.personId, attendanceRecords.personId))
    .where(
      and(
        eq(attendanceRecords.organizationId, organizationId),
        eq(attendanceRecords.status, "present"),
        gte(attendanceRecords.createdAt, new Date(cutoff30)),
        eq(members.organizationId, organizationId),
      ),
    );
  return row?.value ?? 0;
}
