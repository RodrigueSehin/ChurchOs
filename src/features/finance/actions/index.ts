"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  budgetLineSchema,
  budgetSchema,
  financeCategorySchema,
  financialAccountSchema,
  fundSchema,
  transactionSchema,
} from "@/features/finance/schemas";

export interface FinanceActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createFinanceCategory(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une catégorie financière." };

  const parsed = financeCategorySchema.safeParse({ name: formData.get("name"), type: formData.get("type") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("finance_categories").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    type: v.type,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Une catégorie avec ce nom et ce type existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/finance/income");
  revalidatePath("/finance/expenses");
  return { success: true };
}

export async function createFund(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un fonds." };

  const parsed = fundSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    description: formData.get("description"),
    isRestricted: formData.get("isRestricted") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("funds").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    code: orNull(v.code),
    description: orNull(v.description),
    is_restricted: v.isRestricted,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un fonds avec ce code existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/finance/income");
  revalidatePath("/finance/expenses");
  return { success: true };
}

export async function createFinancialAccount(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un compte financier." };

  const parsed = financialAccountSchema.safeParse({
    name: formData.get("name"),
    accountType: formData.get("accountType"),
    providerName: formData.get("providerName"),
    accountReference: formData.get("accountReference"),
    openingBalance: formData.get("openingBalance"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("financial_accounts").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    account_type: v.accountType,
    provider_name: orNull(v.providerName),
    account_reference: orNull(v.accountReference),
    opening_balance: v.openingBalance ? Number(v.openingBalance) : 0,
  });
  if (error) return { error: error.message };

  revalidatePath("/finance/income");
  revalidatePath("/finance/expenses");
  return { success: true };
}

function parseTransactionForm(formData: FormData) {
  return transactionSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    transactionDate: formData.get("transactionDate"),
    description: formData.get("description"),
    reference: formData.get("reference"),
    paymentMethod: formData.get("paymentMethod"),
    accountId: formData.get("accountId"),
    categoryId: formData.get("categoryId"),
    fundId: formData.get("fundId"),
    donorPersonId: formData.get("donorPersonId"),
  });
}

export async function createTransaction(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une opération financière." };

  const parsed = parseTransactionForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const amount = Number(v.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Le montant doit être un nombre positif." };

  const supabase = await createClient();
  const { error } = await supabase.from("financial_transactions").insert({
    organization_id: check.organization.organization.id,
    type: v.type,
    amount,
    transaction_date: v.transactionDate,
    description: orNull(v.description),
    reference: orNull(v.reference),
    payment_method: orNull(v.paymentMethod),
    account_id: orNull(v.accountId),
    category_id: orNull(v.categoryId),
    fund_id: orNull(v.fundId),
    donor_person_id: orNull(v.donorPersonId),
    created_by: check.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(v.type === "income" ? "/finance/income" : "/finance/expenses");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). */
export async function deleteTransaction(transactionId: string, type: string): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une opération financière." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(type === "income" ? "/finance/income" : "/finance/expenses");
  return { success: true };
}

export async function createBudget(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un budget." };

  const parsed = budgetSchema.safeParse({
    name: formData.get("name"),
    fiscalYear: formData.get("fiscalYear"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  if (v.endsOn < v.startsOn) return { error: "La date de fin doit être après la date de début." };

  const supabase = await createClient();
  const { error } = await supabase.from("budgets").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    fiscal_year: Number(v.fiscalYear),
    starts_on: v.startsOn,
    ends_on: v.endsOn,
    status: "draft",
    created_by: check.user.id,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un budget avec ce nom pour cet exercice existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/finance/budgets");
  return { success: true };
}

/** Fait passer un budget de "draft" à "active" — c'est le flux d'approbation de cette phase,
 * distinct de la simple création (`finance.create`) : seul `finance.approve` autorise cette
 * transition. */
export async function approveBudget(budgetId: string): Promise<FinanceActionState> {
  const check = await checkPermission("finance.approve");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'approuver un budget." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update({ status: "active" })
    .eq("id", budgetId)
    .eq("organization_id", check.organization.organization.id)
    .eq("status", "draft");
  if (error) return { error: error.message };

  revalidatePath("/finance/budgets");
  return { success: true };
}

export async function closeBudget(budgetId: string): Promise<FinanceActionState> {
  const check = await checkPermission("finance.approve");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de clôturer un budget." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .update({ status: "closed" })
    .eq("id", budgetId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/finance/budgets");
  return { success: true };
}

export async function addBudgetLine(budgetId: string, _prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce budget." };

  const parsed = budgetLineSchema.safeParse({
    categoryId: formData.get("categoryId"),
    fundId: formData.get("fundId"),
    plannedAmount: formData.get("plannedAmount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("budget_lines").insert({
    organization_id: check.organization.organization.id,
    budget_id: budgetId,
    category_id: orNull(v.categoryId),
    fund_id: orNull(v.fundId),
    planned_amount: Number(v.plannedAmount) || 0,
    notes: orNull(v.notes),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Une ligne pour cette catégorie et ce fonds existe déjà dans ce budget." };
    }
    return { error: error.message };
  }

  revalidatePath("/finance/budgets");
  return { success: true };
}

export async function updateBudgetLineActual(lineId: string, actualAmount: string): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce budget." };

  const amount = Number(actualAmount);
  if (!Number.isFinite(amount) || amount < 0) return { error: "Montant invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("budget_lines")
    .update({ actual_amount: amount })
    .eq("id", lineId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/finance/budgets");
  return { success: true };
}
