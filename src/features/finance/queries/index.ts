import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lt, lte, ne, or, sql, sum } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  budgetLines,
  budgets,
  financeCategories,
  financialAccounts,
  financialTransactionAttachments,
  financialTransactions,
  funds,
  ministries,
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
        ilike(financialTransactions.title, term),
        ilike(financialTransactions.vendorName, term),
        ilike(financialTransactions.donorName, term),
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
        title: financialTransactions.title,
        vendorName: financialTransactions.vendorName,
        donorName: financialTransactions.donorName,
        status: financialTransactions.status,
        attachmentCount: sql<number>`(select count(*)::int from ${financialTransactionAttachments} where ${financialTransactionAttachments.transactionId} = ${financialTransactions.id})`,
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
    .where(and(eq(financialTransactions.organizationId, organizationId), eq(financialTransactions.type, type), ne(financialTransactions.status, "rejected")));

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
        ne(financialTransactions.status, "rejected"),
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
        ne(financialTransactions.status, "rejected"),
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
      title: financialTransactions.title,
      status: financialTransactions.status,
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

/** Fournisseurs déjà saisis (suggestions du champ « Fournisseur » — texte libre). */
export async function getVendorNames(organizationId: string) {
  const rows = await db
    .selectDistinct({ name: financialTransactions.vendorName })
    .from(financialTransactions)
    .where(and(eq(financialTransactions.organizationId, organizationId), isNotNull(financialTransactions.vendorName)))
    .orderBy(asc(financialTransactions.vendorName))
    .limit(100);
  return rows.map((r) => r.name).filter((n): n is string => Boolean(n));
}

// ---------------------------------------------------------------------------------------------
// Budgets (page /finance/budgets)
// ---------------------------------------------------------------------------------------------

export const BUDGETS_PAGE_SIZE = 10;
const BUDGET_STATUSES = ["draft", "active", "closed"] as const;

// Sous-requêtes corrélées écrites en SQL qualifié : dans un `select` mono-table, Drizzle n'ajoute
// pas de préfixe de table aux colonnes, et `"id"` désignerait alors `budget_lines.id` (somme à 0).
const plannedOf = sql<string>`coalesce((select sum(bl.planned_amount) from budget_lines bl where bl.budget_id = "budgets"."id"), 0)`;
const actualOf = sql<string>`coalesce((select sum(bl.actual_amount) from budget_lines bl where bl.budget_id = "budgets"."id"), 0)`;

/** Exercices existants (du plus récent au plus ancien) — alimente le sélecteur d'exercice. */
export async function getBudgetYears(organizationId: string) {
  const rows = await db
    .selectDistinct({ year: budgets.fiscalYear })
    .from(budgets)
    .where(eq(budgets.organizationId, organizationId))
    .orderBy(desc(budgets.fiscalYear));
  return rows.map((r) => r.year);
}

export async function getBudgetsOverview({
  organizationId,
  year,
  status,
  search,
  page = 1,
}: {
  organizationId: string;
  year: number;
  status?: string;
  search?: string;
  page?: number;
}) {
  const conditions = [eq(budgets.organizationId, organizationId), eq(budgets.fiscalYear, year)];
  if (status && (BUDGET_STATUSES as readonly string[]).includes(status)) conditions.push(eq(budgets.status, status));
  if (search?.trim()) conditions.push(ilike(budgets.name, `%${search.trim().replace(/[%_\\]/g, "\\$&")}%`));
  const where = and(...conditions);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: budgets.id,
        name: budgets.name,
        fiscalYear: budgets.fiscalYear,
        startsOn: budgets.startsOn,
        endsOn: budgets.endsOn,
        status: budgets.status,
        planned: plannedOf,
        actual: actualOf,
      })
      .from(budgets)
      .where(where)
      .orderBy(desc(budgets.startsOn), asc(budgets.name))
      .limit(BUDGETS_PAGE_SIZE)
      .offset((page - 1) * BUDGETS_PAGE_SIZE),
    db.select({ value: count() }).from(budgets).where(where),
  ]);

  return { rows, total: total?.value ?? 0, page, pageSize: BUDGETS_PAGE_SIZE };
}

/** Lignes de plusieurs budgets en une requête (colonne « Catégories » et dialogue des lignes). */
export async function getBudgetLinesByBudget(budgetIds: string[]) {
  if (budgetIds.length === 0) return new Map<string, BudgetLineRow[]>();
  const rows = await db
    .select({
      id: budgetLines.id,
      budgetId: budgetLines.budgetId,
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
    .where(inArray(budgetLines.budgetId, budgetIds))
    .orderBy(asc(financeCategories.name));

  const byBudget = new Map<string, BudgetLineRow[]>();
  for (const r of rows) {
    const list = byBudget.get(r.budgetId) ?? [];
    list.push(r);
    byBudget.set(r.budgetId, list);
  }
  return byBudget;
}
type BudgetLineRow = Awaited<ReturnType<typeof getBudgetDetail>> extends infer D
  ? D extends { lines: (infer L)[] }
    ? L & { budgetId: string }
    : never
  : never;

export async function getBudgetTabCounts(organizationId: string, year: number) {
  const rows = await db
    .select({ status: budgets.status, value: count() })
    .from(budgets)
    .where(and(eq(budgets.organizationId, organizationId), eq(budgets.fiscalYear, year)))
    .groupBy(budgets.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.value])) as Record<string, number>;
  return { all: rows.reduce((sum, r) => sum + r.value, 0), draft: by.draft ?? 0, active: by.active ?? 0, closed: by.closed ?? 0 };
}

/** KPI budgets d'un exercice, avec comparaison à l'exercice précédent. */
export async function getBudgetKpis(organizationId: string, year: number) {
  async function totalsFor(y: number) {
    const [row] = await db
      .select({
        planned: sql<string>`coalesce(sum(${budgetLines.plannedAmount}), 0)`,
        actual: sql<string>`coalesce(sum(${budgetLines.actualAmount}), 0)`,
      })
      .from(budgetLines)
      .innerJoin(budgets, eq(budgets.id, budgetLines.budgetId))
      .where(and(eq(budgets.organizationId, organizationId), eq(budgets.fiscalYear, y)));
    const [active] = await db
      .select({ value: count() })
      .from(budgets)
      .where(and(eq(budgets.organizationId, organizationId), eq(budgets.fiscalYear, y), eq(budgets.status, "active")));
    return { planned: Number(row?.planned ?? 0), actual: Number(row?.actual ?? 0), active: active?.value ?? 0 };
  }
  const [now, before] = await Promise.all([totalsFor(year), totalsFor(year - 1)]);
  return {
    planned: { value: now.planned, deltaPct: pctDelta(now.planned, before.planned) },
    actual: { value: now.actual, pctOfPlanned: now.planned > 0 ? Math.round((now.actual / now.planned) * 100) : 0 },
    remaining: { value: Math.max(now.planned - now.actual, 0), pctOfPlanned: now.planned > 0 ? Math.max(0, Math.round(((now.planned - now.actual) / now.planned) * 100)) : 0 },
    active: { value: now.active, delta: now.active - before.active },
  };
}

/** Prévu / engagé par catégorie sur un exercice — graphique d'exécution et donut de répartition. */
export async function getBudgetByCategory(organizationId: string, year: number) {
  const rows = await db
    .select({
      categoryName: financeCategories.name,
      planned: sql<string>`coalesce(sum(${budgetLines.plannedAmount}), 0)`,
      actual: sql<string>`coalesce(sum(${budgetLines.actualAmount}), 0)`,
    })
    .from(budgetLines)
    .innerJoin(budgets, eq(budgets.id, budgetLines.budgetId))
    .leftJoin(financeCategories, eq(financeCategories.id, budgetLines.categoryId))
    .where(and(eq(budgets.organizationId, organizationId), eq(budgets.fiscalYear, year)))
    .groupBy(financeCategories.name);
  return rows
    .map((r) => ({ categoryName: r.categoryName ?? "Sans catégorie", planned: Number(r.planned), actual: Number(r.actual) }))
    .sort((a, b) => b.planned - a.planned);
}

/** Budgets modifiés le plus récemment (carte « Budget récent »). */
export async function getRecentBudgets(organizationId: string, limit = 4) {
  return db
    .select({ id: budgets.id, name: budgets.name, updatedAt: budgets.updatedAt, planned: plannedOf, actual: actualOf })
    .from(budgets)
    .where(eq(budgets.organizationId, organizationId))
    .orderBy(desc(budgets.updatedAt))
    .limit(limit);
}

/** Ministère rattaché à chaque budget (id → nom). Lecture isolée et tolérante : si la colonne
 * `budgets.ministry_id` n'est pas encore migrée, la liste des budgets reste affichable. */
export async function getBudgetMinistries(budgetIds: string[]) {
  const byBudget = new Map<string, string>();
  if (budgetIds.length === 0) return byBudget;
  try {
    const rows = await db
      .select({ id: budgets.id, ministryName: ministries.name })
      .from(budgets)
      .innerJoin(ministries, eq(ministries.id, budgets.ministryId))
      .where(inArray(budgets.id, budgetIds));
    for (const r of rows) byBudget.set(r.id, r.ministryName);
  } catch (error) {
    console.error("getBudgetMinistries: colonne budgets.ministry_id absente ?", error);
  }
  return byBudget;
}
