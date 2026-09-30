import "server-only";
import { and, asc, count, desc, eq, gte, ilike, lt, lte, or, sql, sum } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  budgetLines,
  budgets,
  financeCategories,
  financialAccounts,
  financialTransactions,
  funds,
  people,
} from "@/lib/db/schema";

export const TRANSACTIONS_PAGE_SIZE = 20;

export async function getFinanceCategories(organizationId: string, type?: string) {
  const conditions = [eq(financeCategories.organizationId, organizationId), eq(financeCategories.isActive, true)];
  if (type) conditions.push(eq(financeCategories.type, type as (typeof financeCategories.type.enumValues)[number]));
  return db.select().from(financeCategories).where(and(...conditions)).orderBy(asc(financeCategories.name));
}

export async function getFunds(organizationId: string) {
  return db.select().from(funds).where(and(eq(funds.organizationId, organizationId), eq(funds.isActive, true))).orderBy(asc(funds.name));
}

export async function getFinancialAccounts(organizationId: string) {
  return db
    .select()
    .from(financialAccounts)
    .where(and(eq(financialAccounts.organizationId, organizationId), eq(financialAccounts.isActive, true)))
    .orderBy(asc(financialAccounts.name));
}

export interface TransactionsFilters {
  organizationId: string;
  type: "income" | "expense" | "transfer";
  page?: number;
  search?: string;
  categoryId?: string;
  fundId?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_METHODS = ["cash", "bank_transfer", "card", "mobile_money", "check", "online", "other"] as const;

export async function getTransactions({
  organizationId,
  type,
  page = 1,
  search,
  categoryId,
  fundId,
  paymentMethod,
  from,
  to,
}: TransactionsFilters) {
  const conditions = [eq(financialTransactions.organizationId, organizationId), eq(financialTransactions.type, type)];
  if (categoryId && UUID_RE.test(categoryId)) conditions.push(eq(financialTransactions.categoryId, categoryId));
  if (fundId && UUID_RE.test(fundId)) conditions.push(eq(financialTransactions.fundId, fundId));
  if (paymentMethod && (PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    conditions.push(eq(financialTransactions.paymentMethod, paymentMethod as (typeof PAYMENT_METHODS)[number]));
  }
  if (from && DATE_RE.test(from)) conditions.push(gte(financialTransactions.transactionDate, from));
  if (to && DATE_RE.test(to)) conditions.push(lte(financialTransactions.transactionDate, to));
  if (search?.trim()) {
    const term = `%${search.trim().replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(people.firstName, term),
        ilike(people.lastName, term),
        ilike(financialTransactions.description, term),
        ilike(financialTransactions.reference, term),
      )!,
    );
  }
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: financialTransactions.id,
        amount: financialTransactions.amount,
        currency: financialTransactions.currency,
        transactionDate: financialTransactions.transactionDate,
        description: financialTransactions.description,
        reference: financialTransactions.reference,
        paymentMethod: financialTransactions.paymentMethod,
        categoryId: financialTransactions.categoryId,
        categoryName: financeCategories.name,
        fundName: funds.name,
        accountName: financialAccounts.name,
        donorFirstName: people.firstName,
        donorLastName: people.lastName,
      })
      .from(financialTransactions)
      .leftJoin(financeCategories, eq(financeCategories.id, financialTransactions.categoryId))
      .leftJoin(funds, eq(funds.id, financialTransactions.fundId))
      .leftJoin(financialAccounts, eq(financialAccounts.id, financialTransactions.accountId))
      .leftJoin(people, eq(people.id, financialTransactions.donorPersonId))
      .where(where)
      .orderBy(desc(financialTransactions.transactionDate), desc(financialTransactions.createdAt))
      .limit(TRANSACTIONS_PAGE_SIZE)
      .offset((page - 1) * TRANSACTIONS_PAGE_SIZE),
    db
      .select({ value: count() })
      .from(financialTransactions)
      .leftJoin(people, eq(people.id, financialTransactions.donorPersonId))
      .where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: TRANSACTIONS_PAGE_SIZE };
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** 4 cartes KPI de "Dons & offrandes" (recettes) ou "Dépenses". Mois en cours vs mois précédent ;
 * cumul de l'année vs même période de l'année précédente. */
export async function getTransactionKpis(organizationId: string, type: "income" | "expense") {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const monthStart = isoDate(new Date(Date.UTC(y, m, 1)));
  const prevMonthStart = isoDate(new Date(Date.UTC(y, m - 1, 1)));
  const yearStart = isoDate(new Date(Date.UTC(y, 0, 1)));
  const prevYearStart = isoDate(new Date(Date.UTC(y - 1, 0, 1)));
  const today = isoDate(now);
  const prevYearSameDay = isoDate(new Date(Date.UTC(y - 1, m, now.getUTCDate())));

  const d = financialTransactions.transactionDate;
  const a = financialTransactions.amount;
  const donor = financialTransactions.donorPersonId;

  const [row] = await db
    .select({
      monthSum: sql<string>`coalesce(sum(${a}) filter (where ${d} >= ${monthStart}), 0)`,
      monthCount: sql<number>`(count(*) filter (where ${d} >= ${monthStart}))::int`,
      monthDonors: sql<number>`(count(distinct ${donor}) filter (where ${d} >= ${monthStart}))::int`,
      prevMonthSum: sql<string>`coalesce(sum(${a}) filter (where ${d} >= ${prevMonthStart} and ${d} < ${monthStart}), 0)`,
      prevMonthCount: sql<number>`(count(*) filter (where ${d} >= ${prevMonthStart} and ${d} < ${monthStart}))::int`,
      prevMonthDonors: sql<number>`(count(distinct ${donor}) filter (where ${d} >= ${prevMonthStart} and ${d} < ${monthStart}))::int`,
      yearSum: sql<string>`coalesce(sum(${a}) filter (where ${d} >= ${yearStart} and ${d} <= ${today}), 0)`,
      prevYearSum: sql<string>`coalesce(sum(${a}) filter (where ${d} >= ${prevYearStart} and ${d} <= ${prevYearSameDay}), 0)`,
    })
    .from(financialTransactions)
    .where(and(eq(financialTransactions.organizationId, organizationId), eq(financialTransactions.type, type)));

  const monthSum = Number(row?.monthSum ?? 0);
  const prevMonthSum = Number(row?.prevMonthSum ?? 0);
  const monthCount = row?.monthCount ?? 0;
  const prevMonthCount = row?.prevMonthCount ?? 0;
  const avgNow = monthCount > 0 ? monthSum / monthCount : 0;
  const avgBefore = prevMonthCount > 0 ? prevMonthSum / prevMonthCount : 0;

  return {
    monthTotal: { value: monthSum, deltaPct: pctDelta(monthSum, prevMonthSum) },
    monthCount: { value: monthCount, deltaPct: pctDelta(monthCount, prevMonthCount) },
    activeDonors: { value: row?.monthDonors ?? 0, deltaPct: pctDelta(row?.monthDonors ?? 0, row?.prevMonthDonors ?? 0) },
    yearTotal: { value: Number(row?.yearSum ?? 0), deltaPct: pctDelta(Number(row?.yearSum ?? 0), Number(row?.prevYearSum ?? 0)) },
    average: { value: Math.round(avgNow), deltaPct: pctDelta(avgNow, avgBefore) },
  };
}

/** Opérations d'une année, par mois et par catégorie — alimente le graphique "Évolution des dons". */
export async function getMonthlyTotals(organizationId: string, type: "income" | "expense", year: number) {
  const rows = await db
    .select({
      month: sql<number>`extract(month from ${financialTransactions.transactionDate})::int`,
      categoryName: financeCategories.name,
      total: sum(financialTransactions.amount),
    })
    .from(financialTransactions)
    .leftJoin(financeCategories, eq(financeCategories.id, financialTransactions.categoryId))
    .where(
      and(
        eq(financialTransactions.organizationId, organizationId),
        eq(financialTransactions.type, type),
        gte(financialTransactions.transactionDate, `${year}-01-01`),
        lt(financialTransactions.transactionDate, `${year + 1}-01-01`),
      ),
    )
    .groupBy(sql`extract(month from ${financialTransactions.transactionDate})`, financeCategories.name);

  return rows.map((r) => ({ month: r.month, categoryName: r.categoryName ?? "Sans catégorie", total: Number(r.total ?? 0) }));
}

/** Nombre d'opérations par catégorie (onglets de filtre). */
export async function getCategoryCounts(organizationId: string, type: "income" | "expense") {
  const rows = await db
    .select({ categoryId: financialTransactions.categoryId, value: count() })
    .from(financialTransactions)
    .where(and(eq(financialTransactions.organizationId, organizationId), eq(financialTransactions.type, type)))
    .groupBy(financialTransactions.categoryId);
  const byCategory: Record<string, number> = {};
  let all = 0;
  for (const r of rows) {
    all += r.value;
    if (r.categoryId) byCategory[r.categoryId] = r.value;
  }
  return { all, byCategory };
}

export async function getBudgets(organizationId: string) {
  return db.select().from(budgets).where(eq(budgets.organizationId, organizationId)).orderBy(desc(budgets.fiscalYear), asc(budgets.name));
}

export async function getBudgetDetail(organizationId: string, budgetId: string) {
  const [budget] = await db.select().from(budgets).where(and(eq(budgets.id, budgetId), eq(budgets.organizationId, organizationId)));
  if (!budget) return null;

  const lines = await db
    .select({
      id: budgetLines.id,
      plannedAmount: budgetLines.plannedAmount,
      actualAmount: budgetLines.actualAmount,
      notes: budgetLines.notes,
      categoryId: budgetLines.categoryId,
      categoryName: financeCategories.name,
      fundId: budgetLines.fundId,
      fundName: funds.name,
    })
    .from(budgetLines)
    .leftJoin(financeCategories, eq(financeCategories.id, budgetLines.categoryId))
    .leftJoin(funds, eq(funds.id, budgetLines.fundId))
    .where(eq(budgetLines.budgetId, budgetId))
    .orderBy(asc(financeCategories.name));

  return { budget, lines };
}

/** Rapport financier : totaux recettes/dépenses par catégorie sur une période donnée. */
export async function getFinanceReport({
  organizationId,
  from,
  to,
}: {
  organizationId: string;
  from: string;
  to: string;
}) {
  const rows = await db
    .select({
      type: financialTransactions.type,
      categoryName: financeCategories.name,
      total: sum(financialTransactions.amount),
    })
    .from(financialTransactions)
    .leftJoin(financeCategories, eq(financeCategories.id, financialTransactions.categoryId))
    .where(
      and(
        eq(financialTransactions.organizationId, organizationId),
        gte(financialTransactions.transactionDate, from),
        lte(financialTransactions.transactionDate, to),
      ),
    )
    .groupBy(financialTransactions.type, financeCategories.name)
    .orderBy(asc(financialTransactions.type), asc(financeCategories.name));

  const totalIncome = rows.filter((r) => r.type === "income").reduce((sum, r) => sum + Number(r.total ?? 0), 0);
  const totalExpense = rows.filter((r) => r.type === "expense").reduce((sum, r) => sum + Number(r.total ?? 0), 0);

  return { rows, totalIncome, totalExpense, net: totalIncome - totalExpense };
}

/** Dernières opérations (carte « Dépenses récentes »). */
export async function getRecentTransactions(organizationId: string, type: "income" | "expense", limit = 5) {
  return db
    .select({
      id: financialTransactions.id,
      amount: financialTransactions.amount,
      currency: financialTransactions.currency,
      transactionDate: financialTransactions.transactionDate,
      description: financialTransactions.description,
      categoryName: financeCategories.name,
    })
    .from(financialTransactions)
    .leftJoin(financeCategories, eq(financeCategories.id, financialTransactions.categoryId))
    .where(and(eq(financialTransactions.organizationId, organizationId), eq(financialTransactions.type, type)))
    .orderBy(desc(financialTransactions.transactionDate), desc(financialTransactions.createdAt))
    .limit(limit);
}

/** Avancement (réalisé / prévu) des plus grosses lignes du budget actif le plus récent. */
export async function getActiveBudgetProgress(organizationId: string, limit = 3) {
  const [budget] = await db
    .select()
    .from(budgets)
    .where(and(eq(budgets.organizationId, organizationId), eq(budgets.status, "active")))
    .orderBy(desc(budgets.fiscalYear), desc(budgets.createdAt))
    .limit(1);
  if (!budget) return null;

  const lines = await db
    .select({
      id: budgetLines.id,
      plannedAmount: budgetLines.plannedAmount,
      actualAmount: budgetLines.actualAmount,
      categoryName: financeCategories.name,
    })
    .from(budgetLines)
    .leftJoin(financeCategories, eq(financeCategories.id, budgetLines.categoryId))
    .where(eq(budgetLines.budgetId, budget.id))
    .orderBy(desc(budgetLines.plannedAmount))
    .limit(limit);

  return { budget, lines };
}
