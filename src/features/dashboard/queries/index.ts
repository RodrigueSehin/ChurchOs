import "server-only";
import { and, asc, count, desc, eq, gte, lt, ne, notInArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  eventRegistrations,
  events,
  families,
  financialTransactions,
  members,
  pastoralFollowups,
  people,
  prayerRequests,
  visitors,
  visits,
} from "@/lib/db/schema";

/**
 * Agrégations propres au tableau de bord — accès direct au schéma (mêmes précédent que
 * `features/analytics/queries` : un module d'agrégation transverse lit plusieurs tables
 * directement plutôt que de passer par la façade de chacune, voir 01-project-structure.md).
 */

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

async function scalarCount(rows: Promise<{ value: number }[]>): Promise<number> {
  const r = await rows;
  return r[0]?.value ?? 0;
}

async function sumTransactions(organizationId: string, type: "income" | "expense", from: string, to: string) {
  const [row] = await db
    .select({ value: sql<string>`coalesce(sum(${financialTransactions.amount}), 0)` })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.organizationId, organizationId),
        eq(financialTransactions.type, type),
        gte(financialTransactions.transactionDate, from),
        lt(financialTransactions.transactionDate, to),
      ),
    );
  return Number(row?.value ?? 0);
}

/** `previous <= 0` évite une division par zéro — une organisation qui démarre à 0 affiche +100%
 * dès la première unité plutôt qu'un `Infinity`/`NaN`. */
function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export interface DashboardKpi {
  value: number;
  /** Variation en pourcentage (`null` si la carte affiche une variation absolue à la place). */
  deltaPct: number | null;
  /** Variation absolue (`null` si la carte affiche un pourcentage à la place). */
  deltaAbs: number | null;
  /** "vs mois dernier" ou "ce mois-ci", exactement comme sur la maquette (les deux libellés
   * coexistent selon la carte). */
  period: "vs_last_month" | "this_month";
}

/**
 * Une fonction par carte KPI (plutôt qu'une seule fonction "tout-en-un") pour que l'appelant ne
 * déclenche jamais une requête sur une donnée que le rôle courant n'a pas la permission de voir —
 * même leçon que `/analytics` (Phase 13) qui ne lance ses requêtes finance que si `finance.view`
 * est déjà confirmé, jamais "toujours calculer, filtrer seulement à l'affichage".
 */

export async function getMembersKpi(organizationId: string): Promise<DashboardKpi> {
  const cutoff30 = daysAgoISO(30);
  const [now, before] = await Promise.all([
    scalarCount(db.select({ value: count() }).from(members).where(and(eq(members.organizationId, organizationId), eq(members.status, "active")))),
    scalarCount(
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
    ),
  ]);
  return { value: now, deltaPct: pctDelta(now, before), deltaAbs: null, period: "vs_last_month" };
}

export async function getFamiliesKpi(organizationId: string): Promise<DashboardKpi> {
  const cutoff30 = daysAgoISO(30);
  const [now, before] = await Promise.all([
    scalarCount(db.select({ value: count() }).from(families).where(eq(families.organizationId, organizationId))),
    scalarCount(
      db
        .select({ value: count() })
        .from(families)
        .where(and(eq(families.organizationId, organizationId), sql`${families.createdAt}::date <= ${cutoff30}`)),
    ),
  ]);
  return { value: now, deltaPct: pctDelta(now, before), deltaAbs: null, period: "vs_last_month" };
}

export async function getVisitorsKpi(organizationId: string): Promise<DashboardKpi> {
  const cutoff30 = daysAgoISO(30);
  const [now, before] = await Promise.all([
    scalarCount(db.select({ value: count() }).from(visitors).where(and(eq(visitors.organizationId, organizationId), ne(visitors.status, "archived")))),
    scalarCount(
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
    ),
  ]);
  return { value: now, deltaPct: pctDelta(now, before), deltaAbs: null, period: "vs_last_month" };
}

export async function getEventsKpi(organizationId: string): Promise<DashboardKpi> {
  const thisMonthStart = monthStartISO(0);
  const nextMonthStart = monthStartISO(1);
  const lastMonthStart = monthStartISO(-1);
  const [thisMonth, lastMonth] = await Promise.all([
    scalarCount(
      db
        .select({ value: count() })
        .from(events)
        .where(and(eq(events.organizationId, organizationId), gte(events.startsAt, new Date(thisMonthStart)), lt(events.startsAt, new Date(nextMonthStart)))),
    ),
    scalarCount(
      db
        .select({ value: count() })
        .from(events)
        .where(and(eq(events.organizationId, organizationId), gte(events.startsAt, new Date(lastMonthStart)), lt(events.startsAt, new Date(thisMonthStart)))),
    ),
  ]);
  return { value: thisMonth, deltaPct: null, deltaAbs: thisMonth - lastMonth, period: "this_month" };
}

export async function getGivingKpi(organizationId: string): Promise<DashboardKpi> {
  const thisMonthStart = monthStartISO(0);
  const nextMonthStart = monthStartISO(1);
  const lastMonthStart = monthStartISO(-1);
  const [thisMonth, lastMonth] = await Promise.all([
    sumTransactions(organizationId, "income", thisMonthStart, nextMonthStart),
    sumTransactions(organizationId, "income", lastMonthStart, thisMonthStart),
  ]);
  return { value: thisMonth, deltaPct: pctDelta(thisMonth, lastMonth), deltaAbs: null, period: "vs_last_month" };
}

export async function getPrayerKpi(organizationId: string): Promise<DashboardKpi> {
  const cutoff30 = daysAgoISO(30);
  const [now, before] = await Promise.all([
    scalarCount(db.select({ value: count() }).from(prayerRequests).where(and(eq(prayerRequests.organizationId, organizationId), ne(prayerRequests.status, "archived")))),
    scalarCount(
      db
        .select({ value: count() })
        .from(prayerRequests)
        .where(
          and(
            eq(prayerRequests.organizationId, organizationId),
            ne(prayerRequests.status, "archived"),
            sql`${prayerRequests.createdAt}::date <= ${cutoff30}`,
          ),
        ),
    ),
  ]);
  return { value: now, deltaPct: pctDelta(now, before), deltaAbs: null, period: "this_month" };
}

/** Répartition des membres actifs par tranche d'âge — seuls ceux avec une date de naissance
 * renseignée sont comptés (approximation assumée, pas de fabrication de données manquantes). */
export async function getMemberAgeBreakdown(organizationId: string) {
  const rows = await db
    .select({
      bucket: sql<"children" | "youth" | "adult" | "senior">`case
        when date_part('year', age(current_date, ${people.birthDate})) < 13 then 'children'
        when date_part('year', age(current_date, ${people.birthDate})) < 26 then 'youth'
        when date_part('year', age(current_date, ${people.birthDate})) < 60 then 'adult'
        else 'senior' end`,
      value: count(),
    })
    .from(members)
    .innerJoin(people, eq(people.id, members.personId))
    .where(and(eq(members.organizationId, organizationId), eq(members.status, "active"), sql`${people.birthDate} is not null`))
    .groupBy(sql`1`);
  return rows;
}

export interface FinanceOverview {
  income: number;
  incomeDeltaPct: number;
  expenses: number;
  expensesDeltaPct: number;
  balance: number;
  balanceDeltaPct: number;
}

export async function getFinanceOverview(organizationId: string): Promise<FinanceOverview> {
  const thisMonthStart = monthStartISO(0);
  const nextMonthStart = monthStartISO(1);
  const lastMonthStart = monthStartISO(-1);

  const [income, incomeLast, expenses, expensesLast] = await Promise.all([
    sumTransactions(organizationId, "income", thisMonthStart, nextMonthStart),
    sumTransactions(organizationId, "income", lastMonthStart, thisMonthStart),
    sumTransactions(organizationId, "expense", thisMonthStart, nextMonthStart),
    sumTransactions(organizationId, "expense", lastMonthStart, thisMonthStart),
  ]);

  const balance = income - expenses;
  const balanceLast = incomeLast - expensesLast;

  return {
    income,
    incomeDeltaPct: pctDelta(income, incomeLast),
    expenses,
    expensesDeltaPct: pctDelta(expenses, expensesLast),
    balance,
    balanceDeltaPct: pctDelta(balance, balanceLast),
  };
}

export type RecentActivityKind = "member" | "visit" | "registration" | "offering" | "prayer";

export interface RecentActivityItem {
  kind: RecentActivityKind;
  title: string;
  subtitle: string;
  at: Date;
}

const emptyRows = Promise.resolve([] as never[]);

/** Une entrée par module (le dernier événement de chacun), pas un flux d'audit générique — voir
 * la décision prise pour la Phase "design tableau de bord" : données réelles partielles plutôt que
 * du contenu inventé, dans les limites de ce que le schéma actuel permet d'agréger simplement.
 * `allowedKinds` évite de même lancer une requête sur une donnée que le rôle courant n'a pas la
 * permission de voir (jamais "récupérer puis filtrer à l'affichage"). */
export async function getRecentActivity(organizationId: string, allowedKinds: Set<RecentActivityKind>): Promise<RecentActivityItem[]> {
  const [lastMember, lastVisit, lastRegistration, lastOffering, lastPrayer] = await Promise.all([
    allowedKinds.has("member")
      ? db
          .select({ firstName: people.firstName, lastName: people.lastName, at: members.createdAt })
          .from(members)
          .innerJoin(people, eq(people.id, members.personId))
          .where(eq(members.organizationId, organizationId))
          .orderBy(desc(members.createdAt))
          .limit(1)
      : emptyRows,
    allowedKinds.has("visit")
      ? db
          .select({ lastName: people.lastName, firstName: people.firstName, at: visits.createdAt })
          .from(visits)
          .innerJoin(people, eq(people.id, visits.personId))
          .where(eq(visits.organizationId, organizationId))
          .orderBy(desc(visits.createdAt))
          .limit(1)
      : emptyRows,
    allowedKinds.has("registration")
      ? db
          .select({ eventId: eventRegistrations.eventId, eventTitle: events.title, at: eventRegistrations.registeredAt })
          .from(eventRegistrations)
          .innerJoin(events, eq(events.id, eventRegistrations.eventId))
          .where(eq(eventRegistrations.organizationId, organizationId))
          .orderBy(desc(eventRegistrations.registeredAt))
          .limit(1)
      : emptyRows,
    allowedKinds.has("offering")
      ? db
          .select({ amount: financialTransactions.amount, at: financialTransactions.createdAt })
          .from(financialTransactions)
          .where(and(eq(financialTransactions.organizationId, organizationId), eq(financialTransactions.type, "income")))
          .orderBy(desc(financialTransactions.createdAt))
          .limit(1)
      : emptyRows,
    allowedKinds.has("prayer")
      ? db
          .select({ title: prayerRequests.title, at: prayerRequests.createdAt })
          .from(prayerRequests)
          .where(eq(prayerRequests.organizationId, organizationId))
          .orderBy(desc(prayerRequests.createdAt))
          .limit(1)
      : emptyRows,
  ]);

  const items: RecentActivityItem[] = [];

  if (lastMember[0]) {
    items.push({
      kind: "member",
      title: `${lastMember[0].firstName} ${lastMember[0].lastName}`,
      subtitle: "Nouveau membre enregistré",
      at: lastMember[0].at,
    });
  }
  if (lastVisit[0]) {
    items.push({
      kind: "visit",
      title: "Visite pastorale",
      subtitle: `Visite chez la famille ${lastVisit[0].lastName}`,
      at: lastVisit[0].at,
    });
  }
  if (lastRegistration[0]) {
    const registrationCountRows = await db
      .select({ value: count() })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, lastRegistration[0].eventId));
    const total = registrationCountRows[0]?.value ?? 0;
    items.push({
      kind: "registration",
      title: "Inscription",
      subtitle: `${total} inscription${total > 1 ? "s" : ""} (${lastRegistration[0].eventTitle})`,
      at: lastRegistration[0].at,
    });
  }
  if (lastOffering[0]) {
    items.push({
      kind: "offering",
      title: "Offrande",
      subtitle: `${new Intl.NumberFormat("fr-FR").format(Number(lastOffering[0].amount))} FCFA reçus`,
      at: lastOffering[0].at,
    });
  }
  if (lastPrayer[0]) {
    items.push({ kind: "prayer", title: "Sujet de prière", subtitle: lastPrayer[0].title, at: lastPrayer[0].at });
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export interface MyTaskItem {
  id: string;
  title: string;
  priority: "low" | "normal" | "high" | "urgent";
  dueDate: string | null;
}

/** Suivis pastoraux assignés à l'utilisateur courant, non terminés — reformulés en "tâches" pour
 * cette carte. Aucun garde de permission nécessaire : un suivi assigné reste toujours visible par
 * son assigné, quel que soit son niveau de confidentialité (voir confidentialityLevelFilter). */
export async function getMyPendingTasks(organizationId: string, userId: string, limit = 5): Promise<MyTaskItem[]> {
  return db
    .select({ id: pastoralFollowups.id, title: pastoralFollowups.title, priority: pastoralFollowups.priority, dueDate: pastoralFollowups.dueDate })
    .from(pastoralFollowups)
    .where(
      and(
        eq(pastoralFollowups.organizationId, organizationId),
        eq(pastoralFollowups.assignedToUserId, userId),
        notInArray(pastoralFollowups.status, ["completed", "cancelled", "archived"]),
      ),
    )
    .orderBy(sql`${pastoralFollowups.dueDate} asc nulls last`, asc(pastoralFollowups.createdAt))
    .limit(limit);
}
