import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

export const FINANCE_TYPE_LABELS: Record<string, string> = {
  income: "Recette",
  expense: "Dépense",
  transfer: "Transfert",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  bank_transfer: "Virement bancaire",
  card: "Carte",
  mobile_money: "Mobile money",
  check: "Chèque",
  online: "En ligne",
  other: "Autre",
};

export const BUDGET_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  active: "Actif",
  closed: "Clôturé",
};

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: "Caisse",
  bank: "Compte bancaire",
  mobile_money: "Mobile money",
  other: "Autre",
};

export const financeCategorySchema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.enum(["income", "expense", "transfer"]).default("income"),
});

export const fundSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  code: optionalString,
  description: optionalString,
  isRestricted: z.boolean().default(false),
});

export const financialAccountSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  accountType: z.enum(["cash", "bank", "mobile_money", "other"]).default("cash"),
  providerName: optionalString,
  accountReference: optionalString,
  openingBalance: optionalString,
});

export const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.string().min(1, "Montant requis"),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date requise"),
  description: optionalString,
  reference: optionalString,
  // Champ optionnel rendu par un <select> dont l'option "—" vaut "" (pas absente du FormData) :
  // un `z.enum(...)` rejetterait "" avant même que `.nullish()` n'ait sa chance (seul `null`/
  // `undefined` sont catchés par `.nullish()`, pas une chaîne vide qui ne matche aucune valeur
  // de l'enum) — d'où une chaîne libre ici, la vraie validation de l'enum a lieu à l'insertion
  // Postgres (colonne `payment_method` réellement typée en enum côté base).
  paymentMethod: optionalString,
  accountId: optionalString,
  categoryId: optionalString,
  fundId: optionalString,
  donorPersonId: optionalString,
});
export type TransactionInput = z.infer<typeof transactionSchema>;

export const budgetSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  fiscalYear: z.string().regex(/^\d{4}$/, "Année requise"),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de début requise"),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date de fin requise"),
});
export type BudgetInput = z.infer<typeof budgetSchema>;

export const budgetLineSchema = z.object({
  categoryId: optionalString,
  fundId: optionalString,
  plannedAmount: z.string().min(1, "Montant planifié requis"),
  notes: optionalString,
});
