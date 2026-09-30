"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_FILES,
  budgetLineSchema,
  budgetSchema,
  financeCategorySchema,
  financialAccountSchema,
  fundSchema,
  transactionSchema,
} from "@/features/finance/schemas";

const FINANCE_BUCKET = "churchos-finance";

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

  const parsed = financeCategorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    parentId: formData.get("parentId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("finance_categories").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    type: v.type,
    parent_id: orNull(v.parentId),
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
    title: formData.get("title"),
    notes: formData.get("notes"),
    vendorName: formData.get("vendorName"),
    invoiceDate: formData.get("invoiceDate"),
    subcategoryId: formData.get("subcategoryId"),
    campusId: formData.get("campusId"),
    donorName: formData.get("donorName"),
    status: formData.get("status"),
  });
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function createTransaction(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une opération financière." };

  const parsed = parseTransactionForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const amount = Number(v.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Le montant doit être un nombre positif." };

  const files = formData
    .getAll("attachments")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > ATTACHMENT_MAX_FILES) return { error: `${ATTACHMENT_MAX_FILES} fichiers maximum.` };
  for (const file of files) {
    if (!ATTACHMENT_ALLOWED_MIME_TYPES.includes(file.type)) {
      return { error: `« ${file.name} » : format non accepté (PDF, JPG ou PNG uniquement).` };
    }
    if (file.size > ATTACHMENT_MAX_BYTES) return { error: `« ${file.name} » dépasse 10 Mo.` };
  }

  const organizationId = check.organization.organization.id;
  // Identifiant généré ici pour pouvoir ranger les fichiers sous `<org>/<transaction>/...` AVANT
  // l'insertion, puis retirer ces fichiers si l'insertion échoue (pas d'orphelins Storage).
  const transactionId = crypto.randomUUID();
  const supabase = await createClient();

  const uploaded: { path: string; file: File }[] = [];
  for (const file of files) {
    const path = `${organizationId}/${transactionId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(FINANCE_BUCKET).upload(path, file, { contentType: file.type });
    if (uploadError) {
      if (uploaded.length > 0) await supabase.storage.from(FINANCE_BUCKET).remove(uploaded.map((u) => u.path));
      return { error: `Échec du téléversement de « ${file.name} » : ${uploadError.message}` };
    }
    uploaded.push({ path, file });
  }

  // Les colonnes ajoutées par db/migrations/2026-09-30-expense-form-fields.sql ne sont envoyées que
  // si elles sont renseignées : les autres formulaires (ex. dons) continuent de fonctionner tant
  // que la migration n'est pas appliquée.
  const extra: Record<string, string | null> = {};
  const optional: [string, string][] = [
    ["title", v.title],
    ["notes", v.notes],
    ["vendor_name", v.vendorName],
    ["invoice_date", v.invoiceDate],
    ["subcategory_id", v.subcategoryId],
    ["campus_id", v.campusId],
    ["donor_name", v.donorName],
  ];
  for (const [column, value] of optional) if (value.trim() !== "") extra[column] = value.trim();
  if (v.status !== "validated") extra.status = v.status;

  const { error } = await supabase.from("financial_transactions").insert({
    id: transactionId,
    organization_id: organizationId,
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
    ...extra,
  });
  if (error) {
    if (uploaded.length > 0) await supabase.storage.from(FINANCE_BUCKET).remove(uploaded.map((u) => u.path));
    return { error: error.message };
  }

  if (uploaded.length > 0) {
    const { error: attachError } = await supabase.from("financial_transaction_attachments").insert(
      uploaded.map(({ path, file }) => ({
        organization_id: organizationId,
        transaction_id: transactionId,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
        created_by: check.user.id,
      })),
    );
    if (attachError) {
      // La dépense est enregistrée ; seules les pièces jointes ont échoué — on le dit clairement.
      await supabase.storage.from(FINANCE_BUCKET).remove(uploaded.map((u) => u.path));
      revalidatePath(v.type === "income" ? "/finance/income" : "/finance/expenses");
      return { error: `Dépense enregistrée, mais pièces jointes non conservées : ${attachError.message}` };
    }
  }

  revalidatePath(v.type === "income" ? "/finance/income" : "/finance/expenses");
  return { success: true };
}

/** Valide / met en attente / rejette une dépense. Réservé à `finance.approve` (ou admin). */
export async function updateTransactionStatus(transactionId: string, status: string): Promise<FinanceActionState> {
  const check = await checkPermission("finance.approve");
  if (!check.allowed && !check.context.isAdmin) return { error: "Vous n'avez pas la permission d'approuver une opération." };
  if (!["validated", "pending", "rejected"].includes(status)) return { error: "Statut invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_transactions")
    .update({ status })
    .eq("id", transactionId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/finance/expenses");
  return { success: true };
}

export interface AttachmentLink {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  url: string;
}

/** Liens de téléchargement temporaires (60 s) des justificatifs d'une opération. */
export async function getAttachmentLinks(transactionId: string): Promise<{ error?: string; links?: AttachmentLink[] }> {
  const check = await checkPermission("finance.view");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de consulter les finances." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_transaction_attachments")
    .select("id, file_name, storage_path, size_bytes")
    .eq("transaction_id", transactionId)
    .eq("organization_id", check.organization.organization.id)
    .order("created_at");
  if (error) return { error: error.message };

  const links: AttachmentLink[] = [];
  for (const row of data ?? []) {
    const { data: signed } = await supabase.storage.from(FINANCE_BUCKET).createSignedUrl(row.storage_path, 60);
    if (signed?.signedUrl) links.push({ id: row.id, fileName: row.file_name, sizeBytes: row.size_bytes, url: signed.signedUrl });
  }
  return { links };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). */
export async function deleteTransaction(transactionId: string, type: string): Promise<FinanceActionState> {
  const check = await checkPermission("finance.create");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une opération financière." };
  }

  const supabase = await createClient();
  const organizationId = check.organization.organization.id;

  // Chemins des justificatifs à retirer de Storage une fois la ligne supprimée (les lignes
  // `financial_transaction_attachments` partent en cascade, pas les fichiers).
  const { data: attachments } = await supabase
    .from("financial_transaction_attachments")
    .select("storage_path")
    .eq("transaction_id", transactionId)
    .eq("organization_id", organizationId);

  const { error } = await supabase
    .from("financial_transactions")
    .delete()
    .eq("id", transactionId)
    .eq("organization_id", organizationId);
  if (error) return { error: error.message };

  if (attachments && attachments.length > 0) {
    await supabase.storage.from(FINANCE_BUCKET).remove(attachments.map((a) => a.storage_path));
  }

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
