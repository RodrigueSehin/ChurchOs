import "server-only";
import { and, asc, count, desc, eq, gte, lte, sum } from "drizzle-orm";

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

export async function getTransactions({
  organizationId,
  type,
  page = 1,
}: {
  organizationId: string;
  type: "income" | "expense" | "transfer";
  page?: number;
}) {
  const where = and(eq(financialTransactions.organizationId, organizationId), eq(financialTransactions.type, type));

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
    db.select({ value: count() }).from(financialTransactions).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: TRANSACTIONS_PAGE_SIZE };
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
