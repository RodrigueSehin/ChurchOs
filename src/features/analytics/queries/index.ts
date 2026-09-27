import "server-only";
import { and, count, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  attendanceRecords,
  attendanceSessions,
  financialTransactions,
  members,
} from "@/lib/db/schema";

/** Premier jour du mois, `n` mois avant le mois courant — calculé en JS plutôt qu'avec un
 * `interval` SQL construit par concaténation de chaîne (voir la leçon de la Phase 7 sur les
 * fragments `sql` bruts : toujours convertir une valeur temporelle en paramètre, jamais en texte
 * interpolé dans la requête). */
function firstOfMonthsAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 10);
}

/** Répartition des membres par statut — utilisée pour le graphique en anneau du tableau de bord. */
export async function getMemberStatusBreakdown(organizationId: string) {
  const rows = await db
    .select({ status: members.status, value: count() })
    .from(members)
    .where(eq(members.organizationId, organizationId))
    .groupBy(members.status);
  return rows;
}

/**
 * Nouveaux membres par mois sur les `months` derniers mois (par défaut 6), regroupés sur
 * `coalesce(membership_date, created_at::date)` — un membre importé sans date d'adhésion
 * explicite est rattaché à sa date de création plutôt qu'exclu du graphique.
 */
export async function getMembershipGrowth(organizationId: string, months = 6) {
  const cutoff = firstOfMonthsAgo(months - 1);
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', coalesce(${members.membershipDate}, ${members.createdAt}::date)), 'YYYY-MM')`,
      value: count(),
    })
    .from(members)
    .where(
      and(
        eq(members.organizationId, organizationId),
        sql`coalesce(${members.membershipDate}, ${members.createdAt}::date) >= ${cutoff}`,
      ),
    )
    .groupBy(sql`date_trunc('month', coalesce(${members.membershipDate}, ${members.createdAt}::date))`)
    .orderBy(sql`date_trunc('month', coalesce(${members.membershipDate}, ${members.createdAt}::date))`);
  return rows;
}

export async function getActiveMembersCount(organizationId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(members)
    .where(and(eq(members.organizationId, organizationId), eq(members.status, "active")));
  return row?.value ?? 0;
}

export async function getNewMembersLast30Days(organizationId: string) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const [row] = await db
    .select({ value: count() })
    .from(members)
    .where(
      and(
        eq(members.organizationId, organizationId),
        sql`coalesce(${members.membershipDate}, ${members.createdAt}::date) >= ${cutoffStr}`,
      ),
    );
  return row?.value ?? 0;
}

/** Présence des `limit` dernières sessions (par défaut 8), triées chronologiquement pour le
 * graphique (la requête trie par date décroissante pour prendre les plus récentes, puis on
 * inverse en mémoire). */
export async function getAttendanceTrend(organizationId: string, limit = 8) {
  const rows = await db
    .select({
      sessionId: attendanceSessions.id,
      title: attendanceSessions.title,
      startsAt: attendanceSessions.startsAt,
      value: count(attendanceRecords.id),
    })
    .from(attendanceSessions)
    .leftJoin(
      attendanceRecords,
      and(eq(attendanceRecords.sessionId, attendanceSessions.id), eq(attendanceRecords.status, "present")),
    )
    .where(eq(attendanceSessions.organizationId, organizationId))
    .groupBy(attendanceSessions.id, attendanceSessions.title, attendanceSessions.startsAt)
    .orderBy(sql`${attendanceSessions.startsAt} desc`)
    .limit(limit);
  return rows.reverse();
}

export async function getAverageRecentAttendance(organizationId: string, sessions = 4) {
  const trend = await getAttendanceTrend(organizationId, sessions);
  if (trend.length === 0) return 0;
  const total = trend.reduce((sum, row) => sum + row.value, 0);
  return Math.round(total / trend.length);
}

/** Réservé à l'appelant : le total des dons est une donnée financière, gatée sur `finance.view`
 * là où cette fonction est appelée (jamais sur `reports.view`, qui n'implique pas l'accès aux
 * finances — voir la leçon de la Phase 9). */
export async function getGivingThisMonth(organizationId: string) {
  const firstOfMonth = firstOfMonthsAgo(0);
  const [row] = await db
    .select({ value: sql<string>`coalesce(sum(${financialTransactions.amount}), 0)` })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.organizationId, organizationId),
        eq(financialTransactions.type, "income"),
        gte(financialTransactions.transactionDate, firstOfMonth),
      ),
    );
  return Number(row?.value ?? 0);
}

/** Revenus/dépenses mensuels sur les `months` derniers mois — réservé à l'appelant (`finance.view`). */
export async function getFinanceMonthlyTrend(organizationId: string, months = 6) {
  const cutoff = firstOfMonthsAgo(months - 1);
  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${financialTransactions.transactionDate}), 'YYYY-MM')`,
      type: financialTransactions.type,
      value: sql<string>`sum(${financialTransactions.amount})`,
    })
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.organizationId, organizationId),
        gte(financialTransactions.transactionDate, cutoff),
      ),
    )
    .groupBy(sql`date_trunc('month', ${financialTransactions.transactionDate})`, financialTransactions.type)
    .orderBy(sql`date_trunc('month', ${financialTransactions.transactionDate})`);

  const monthMap = new Map<string, { month: string; income: number; expense: number }>();
  for (const row of rows) {
    const entry = monthMap.get(row.month) ?? { month: row.month, income: 0, expense: 0 };
    if (row.type === "income") entry.income = Number(row.value);
    else if (row.type === "expense") entry.expense = Number(row.value);
    monthMap.set(row.month, entry);
  }
  return Array.from(monthMap.values());
}
