import "server-only";
import { and, eq, gte, inArray, lte, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { auditLogs, budgetLines, budgets, financeCategories, financialTransactions, funds, ministries, profiles } from "@/lib/db/schema";
import type { Cell, FinancialReport, ReportParams, ReportSection, ReportType } from "./types";
import { REPORT_TYPE_LABELS } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const REPORT_RUN_ACTION = "finance.report.generated";

export function normalizeParams(input: { from?: string; to?: string; categoryId?: string; fundId?: string }): ReportParams {
  const year = new Date().getUTCFullYear();
  const from = input.from && DATE_RE.test(input.from) ? input.from : `${year}-01-01`;
  const to = input.to && DATE_RE.test(input.to) ? input.to : `${year}-12-31`;
  return {
    from: from <= to ? from : to,
    to: from <= to ? to : from,
    categoryId: input.categoryId && UUID_RE.test(input.categoryId) ? input.categoryId : undefined,
    fundId: input.fundId && UUID_RE.test(input.fundId) ? input.fundId : undefined,
  };
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Période précédente de même durée, juste avant `from` (comparaison « vs période précédente »). */
function previousPeriod(from: string, to: string) {
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
  const prevTo = addDays(from, -1);
  return { from: addDays(prevTo, -(days - 1)), to: prevTo };
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function txConditions(organizationId: string, p: { from: string; to: string; categoryId?: string; fundId?: string }) {
  const conditions = [
    eq(financialTransactions.organizationId, organizationId),
    inArray(financialTransactions.type, ["income", "expense"]),
    ne(financialTransactions.status, "rejected"),
    gte(financialTransactions.transactionDate, p.from),
    lte(financialTransactions.transactionDate, p.to),
  ];
  if (p.categoryId) conditions.push(eq(financialTransactions.categoryId, p.categoryId));
  if (p.fundId) conditions.push(eq(financialTransactions.fundId, p.fundId));
  return and(...conditions);
}

async function totalsFor(organizationId: string, p: { from: string; to: string; categoryId?: string; fundId?: string }) {
  const rows = await db
    .select({ type: financialTransactions.type, total: sql<string>`coalesce(sum(${financialTransactions.amount}), 0)` })
    .from(financialTransactions)
    .where(txConditions(organizationId, p))
    .groupBy(financialTransactions.type);
  const by = Object.fromEntries(rows.map((r) => [r.type, Number(r.total)])) as Record<string, number>;
  return { revenue: by.income ?? 0, expenses: by.expense ?? 0 };
}

/** Données brutes d'un rapport, avant mise en forme en sections (aperçu de la page + exports). */
export async function getReportData(organizationId: string, params: ReportParams) {
  const prev = previousPeriod(params.from, params.to);

  const [totals, prevTotals, catRows, monthRows, budgetRows] = await Promise.all([
    totalsFor(organizationId, params),
    totalsFor(organizationId, { ...prev, categoryId: params.categoryId, fundId: params.fundId }),
    db
      .select({
        categoryId: financialTransactions.categoryId,
        categoryName: financeCategories.name,
        type: financialTransactions.type,
        total: sql<string>`coalesce(sum(${financialTransactions.amount}), 0)`,
      })
      .from(financialTransactions)
      .leftJoin(financeCategories, eq(financeCategories.id, financialTransactions.categoryId))
      .where(txConditions(organizationId, params))
      .groupBy(financialTransactions.categoryId, financeCategories.name, financialTransactions.type),
    db
      .select({
        month: sql<string>`to_char(${financialTransactions.transactionDate}, 'YYYY-MM')`,
        type: financialTransactions.type,
        total: sql<string>`coalesce(sum(${financialTransactions.amount}), 0)`,
      })
      .from(financialTransactions)
      .where(txConditions(organizationId, params))
      .groupBy(sql`to_char(${financialTransactions.transactionDate}, 'YYYY-MM')`, financialTransactions.type),
    // Budgets qui chevauchent la période (lignes filtrées par catégorie / fonds si demandé).
    db
      .select({
        categoryId: budgetLines.categoryId,
        categoryName: financeCategories.name,
        planned: sql<string>`coalesce(sum(${budgetLines.plannedAmount}), 0)`,
        actual: sql<string>`coalesce(sum(${budgetLines.actualAmount}), 0)`,
      })
      .from(budgetLines)
      .innerJoin(budgets, eq(budgets.id, budgetLines.budgetId))
      .leftJoin(financeCategories, eq(financeCategories.id, budgetLines.categoryId))
      .where(
        and(
          eq(budgets.organizationId, organizationId),
          lte(budgets.startsOn, params.to),
          gte(budgets.endsOn, params.from),
          ...(params.categoryId ? [eq(budgetLines.categoryId, params.categoryId)] : []),
          ...(params.fundId ? [eq(budgetLines.fundId, params.fundId)] : []),
        ),
      )
      .groupBy(budgetLines.categoryId, financeCategories.name),
  ]);

  // Catégories : union des catégories vues en transactions et en lignes budgétaires.
  const categories = new Map<string, { name: string; income: number; expense: number; planned: number; actual: number }>();
  const slot = (id: string | null, name: string | null) => {
    const key = id ?? "none";
    if (!categories.has(key)) categories.set(key, { name: name ?? "Sans catégorie", income: 0, expense: 0, planned: 0, actual: 0 });
    return categories.get(key)!;
  };
  for (const r of catRows) slot(r.categoryId, r.categoryName)[r.type === "income" ? "income" : "expense"] += Number(r.total);
  for (const r of budgetRows) {
    const s = slot(r.categoryId, r.categoryName);
    s.planned += Number(r.planned);
    s.actual += Number(r.actual);
  }
  const categoryList = [...categories.values()].sort((a, b) => b.income + b.expense - (a.income + a.expense));

  // Mois : tous les mois de la période, même sans mouvement (courbe continue), solde cumulé.
  const byMonth = new Map<string, { income: number; expense: number }>();
  for (const r of monthRows) {
    const m = byMonth.get(r.month) ?? { income: 0, expense: 0 };
    m[r.type === "income" ? "income" : "expense"] += Number(r.total);
    byMonth.set(r.month, m);
  }
  const months: { month: string; income: number; expense: number; cumulative: number }[] = [];
  let cursor = new Date(`${params.from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${params.to.slice(0, 7)}-01T00:00:00Z`);
  let cumulative = 0;
  while (cursor <= end && months.length < 120) {
    const key = cursor.toISOString().slice(0, 7);
    const m = byMonth.get(key) ?? { income: 0, expense: 0 };
    cumulative += m.income - m.expense;
    months.push({ month: key, income: m.income, expense: m.expense, cumulative });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  const budgetPlanned = categoryList.reduce((sum, c) => sum + c.planned, 0);

  return {
    params,
    totals: { ...totals, balance: totals.revenue - totals.expenses },
    deltas: {
      revenue: pctDelta(totals.revenue, prevTotals.revenue),
      expenses: pctDelta(totals.expenses, prevTotals.expenses),
      balance: pctDelta(totals.revenue - totals.expenses, prevTotals.revenue - prevTotals.expenses),
    },
    budgetPlanned,
    executionRate: budgetPlanned > 0 ? Math.round((totals.expenses / budgetPlanned) * 100) : null,
    categories: categoryList,
    months,
  };
}
export type ReportData = Awaited<ReturnType<typeof getReportData>>;

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

async function ministrySection(organizationId: string, params: ReportParams): Promise<ReportSection> {
  const rows = await db
    .select({
      ministryName: ministries.name,
      budgetCount: sql<number>`count(distinct ${budgets.id})::int`,
      planned: sql<string>`coalesce(sum(${budgetLines.plannedAmount}), 0)`,
      actual: sql<string>`coalesce(sum(${budgetLines.actualAmount}), 0)`,
    })
    .from(budgets)
    .leftJoin(ministries, eq(ministries.id, budgets.ministryId))
    .innerJoin(budgetLines, eq(budgetLines.budgetId, budgets.id))
    .where(
      and(
        eq(budgets.organizationId, organizationId),
        lte(budgets.startsOn, params.to),
        gte(budgets.endsOn, params.from),
        ...(params.categoryId ? [eq(budgetLines.categoryId, params.categoryId)] : []),
        ...(params.fundId ? [eq(budgetLines.fundId, params.fundId)] : []),
      ),
    )
    .groupBy(ministries.name);

  const data = rows
    .map((r) => ({ name: r.ministryName ?? "Sans ministère", count: r.budgetCount, planned: Number(r.planned), actual: Number(r.actual) }))
    .sort((a, b) => b.planned - a.planned);
  const total = data.reduce((acc, r) => ({ count: acc.count + r.count, planned: acc.planned + r.planned, actual: acc.actual + r.actual }), { count: 0, planned: 0, actual: 0 });

  return {
    title: "Budgets par ministère",
    columns: [
      { key: "ministry", label: "Ministère", kind: "text" },
      { key: "budgets", label: "Budgets", kind: "number" },
      { key: "planned", label: "Prévu", kind: "money" },
      { key: "actual", label: "Engagé", kind: "money" },
      { key: "remaining", label: "Reste", kind: "money" },
      { key: "rate", label: "Taux d'exécution", kind: "percent" },
    ],
    rows: data.map((r) => ({ ministry: r.name, budgets: r.count, planned: r.planned, actual: r.actual, remaining: Math.max(r.planned - r.actual, 0), rate: pct(r.actual, r.planned) })),
    footer: { ministry: "Total", budgets: total.count, planned: total.planned, actual: total.actual, remaining: Math.max(total.planned - total.actual, 0), rate: pct(total.actual, total.planned) },
  };
}

export async function buildFinancialReport({
  organizationId,
  organizationName,
  currency,
  generatedBy,
  type,
  params,
}: {
  organizationId: string;
  organizationName: string;
  currency: string;
  generatedBy: string | null;
  type: ReportType;
  params: ReportParams;
}): Promise<FinancialReport> {
  const data = await getReportData(organizationId, params);
  const { totals } = data;

  let sections: ReportSection[] = [];
  if (type === "overview") {
    sections = [
      {
        title: "Détail par catégorie",
        columns: [
          { key: "category", label: "Catégorie", kind: "text" },
          { key: "income", label: "Revenus", kind: "money" },
          { key: "expense", label: "Dépenses", kind: "money" },
          { key: "balance", label: "Solde", kind: "money" },
          { key: "rate", label: "Taux d'exécution", kind: "percent" },
        ],
        rows: data.categories.map((c) => ({ category: c.name, income: c.income, expense: c.expense, balance: c.income - c.expense, rate: pct(c.expense, c.planned) })),
        footer: { category: "Total", income: totals.revenue, expense: totals.expenses, balance: totals.balance, rate: data.executionRate },
      },
    ];
  } else if (type === "income_statement") {
    const income = data.categories.filter((c) => c.income > 0).sort((a, b) => b.income - a.income);
    const expense = data.categories.filter((c) => c.expense > 0).sort((a, b) => b.expense - a.expense);
    sections = [
      {
        title: "Revenus",
        columns: [
          { key: "category", label: "Catégorie", kind: "text" },
          { key: "amount", label: "Montant", kind: "money" },
          { key: "share", label: "% du total", kind: "percent" },
        ],
        rows: income.map((c) => ({ category: c.name, amount: c.income, share: pct(c.income, totals.revenue) })),
        footer: { category: "Total des revenus", amount: totals.revenue, share: totals.revenue > 0 ? 100 : null },
      },
      {
        title: "Dépenses",
        columns: [
          { key: "category", label: "Catégorie", kind: "text" },
          { key: "amount", label: "Montant", kind: "money" },
          { key: "share", label: "% du total", kind: "percent" },
        ],
        rows: expense.map((c) => ({ category: c.name, amount: c.expense, share: pct(c.expense, totals.expenses) })),
        footer: { category: "Total des dépenses", amount: totals.expenses, share: totals.expenses > 0 ? 100 : null },
      },
      {
        title: "Résultat",
        columns: [
          { key: "label", label: "Libellé", kind: "text" },
          { key: "amount", label: "Montant", kind: "money" },
        ],
        rows: [
          { label: "Total des revenus", amount: totals.revenue },
          { label: "Total des dépenses", amount: totals.expenses },
          { label: "Résultat net de la période", amount: totals.balance },
        ],
      },
    ];
  } else if (type === "budget_execution") {
    const rows = data.categories.filter((c) => c.planned > 0 || c.expense > 0).sort((a, b) => b.planned - a.planned);
    const planned = rows.reduce((s, c) => s + c.planned, 0);
    const spent = rows.reduce((s, c) => s + c.expense, 0);
    sections = [
      {
        title: "Exécution budgétaire par catégorie",
        columns: [
          { key: "category", label: "Catégorie", kind: "text" },
          { key: "planned", label: "Budget prévu", kind: "money" },
          { key: "spent", label: "Dépenses réelles", kind: "money" },
          { key: "remaining", label: "Reste à engager", kind: "money" },
          { key: "rate", label: "Taux d'exécution", kind: "percent" },
        ],
        rows: rows.map((c) => ({ category: c.name, planned: c.planned, spent: c.expense, remaining: Math.max(c.planned - c.expense, 0), rate: pct(c.expense, c.planned) })),
        footer: { category: "Total", planned, spent, remaining: Math.max(planned - spent, 0), rate: pct(spent, planned) },
      },
    ];
  } else if (type === "cashflow") {
    sections = [
      {
        title: "Flux de trésorerie mensuel",
        columns: [
          { key: "month", label: "Mois", kind: "text" },
          { key: "inflow", label: "Entrées", kind: "money" },
          { key: "outflow", label: "Sorties", kind: "money" },
          { key: "net", label: "Solde net", kind: "money" },
          { key: "cumulative", label: "Solde cumulé", kind: "money" },
        ],
        rows: data.months.map((m) => ({ month: monthLabel(m.month), inflow: m.income, outflow: m.expense, net: m.income - m.expense, cumulative: m.cumulative })),
        footer: { month: "Total", inflow: totals.revenue, outflow: totals.expenses, net: totals.balance, cumulative: totals.balance },
      },
    ];
  } else {
    sections = [await ministrySection(organizationId, params)];
  }

  const [category, fund] = await Promise.all([
    params.categoryId ? db.select({ name: financeCategories.name }).from(financeCategories).where(eq(financeCategories.id, params.categoryId)).then((r) => r[0]?.name ?? null) : null,
    params.fundId ? db.select({ name: funds.name }).from(funds).where(eq(funds.id, params.fundId)).then((r) => r[0]?.name ?? null) : null,
  ]);

  return {
    type,
    title: `${REPORT_TYPE_LABELS[type]} — ${params.from} au ${params.to}`,
    organizationName,
    currency,
    generatedAt: new Date().toISOString(),
    generatedBy,
    period: { from: params.from, to: params.to },
    filters: { category, fund },
    summary: { revenue: totals.revenue, expenses: totals.expenses, balance: totals.balance, budgetPlanned: data.budgetPlanned, executionRate: data.executionRate },
    sections,
  };
}

export async function getRecentReportRuns(organizationId: string, limit = 3) {
  const rows = await db
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      metadata: auditLogs.metadata,
      actor: profiles.displayName,
    })
    .from(auditLogs)
    .leftJoin(profiles, eq(profiles.id, auditLogs.userId))
    .where(and(eq(auditLogs.organizationId, organizationId), eq(auditLogs.action, REPORT_RUN_ACTION)))
    .orderBy(sql`${auditLogs.createdAt} desc`)
    .limit(limit);
  return rows.map((r) => ({ id: r.id, createdAt: r.createdAt, actor: r.actor, meta: r.metadata as Record<string, string | null> }));
}

export async function logReportRun(organizationId: string, userId: string, meta: Record<string, string | null>) {
  await db.insert(auditLogs).values({ organizationId, userId, action: REPORT_RUN_ACTION, entityType: "finance_report", metadata: meta });
}

export type { Cell };
export { pctDelta };
