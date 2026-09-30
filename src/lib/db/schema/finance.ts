import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  bigint,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";
import { campuses, organizations } from "./identity-org";
import { people } from "./people";
import { events } from "./events";
import { financeEntryType, paymentMethod } from "./enums";

export const financeCategories = pgTable(
  "finance_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: financeEntryType("type").notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => financeCategories.id, {
      onDelete: "set null",
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("finance_categories_org_name_type_unique").on(
      table.organizationId,
      table.name,
      table.type,
    ),
  ],
);

export const funds = pgTable(
  "funds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    description: text("description"),
    isRestricted: boolean("is_restricted").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("funds_org_code_unique").on(table.organizationId, table.code)],
);

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    accountType: text("account_type").notNull(),
    providerName: text("provider_name"),
    accountReference: text("account_reference"),
    currency: char("currency", { length: 3 }).notNull().default("XOF"),
    openingBalance: numeric("opening_balance", { precision: 14, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "financial_accounts_type_check",
      sql`${table.accountType} in ('cash','bank','mobile_money','other')`,
    ),
  ],
);

export const financialTransactions = pgTable(
  "financial_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => financialAccounts.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => financeCategories.id, { onDelete: "set null" }),
    fundId: uuid("fund_id").references(() => funds.id, { onDelete: "set null" }),
    type: financeEntryType("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("XOF"),
    transactionDate: date("transaction_date").notNull().defaultNow(),
    description: text("description"),
    reference: text("reference"),
    paymentMethod: paymentMethod("payment_method"),
    donorPersonId: uuid("donor_person_id").references(() => people.id, { onDelete: "set null" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
    // Formulaire « Nouvelle dépense » (db/migrations/2026-09-30-expense-form-fields.sql)
    title: text("title"),
    notes: text("notes"),
    vendorName: text("vendor_name"),
    invoiceDate: date("invoice_date"),
    subcategoryId: uuid("subcategory_id").references((): AnyPgColumn => financeCategories.id, { onDelete: "set null" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    status: text("status").notNull().default("validated"),
    donorName: text("donor_name"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("financial_transactions_amount_check", sql`${table.amount} > 0`),
    check("financial_transactions_status_check", sql`${table.status} in ('validated','pending','rejected')`),
  ],
);

export const financialTransactionAttachments = pgTable("financial_transaction_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => financialTransactions.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: text("status").notNull().default("draft"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("budgets_org_name_year_unique").on(table.organizationId, table.name, table.fiscalYear),
    check("budgets_status_check", sql`${table.status} in ('draft','active','closed')`),
    check("budgets_date_range_check", sql`${table.endsOn} >= ${table.startsOn}`),
  ],
);

export const budgetLines = pgTable(
  "budget_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => financeCategories.id, { onDelete: "set null" }),
    fundId: uuid("fund_id").references(() => funds.id, { onDelete: "set null" }),
    plannedAmount: numeric("planned_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    actualAmount: numeric("actual_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("budget_lines_unique").on(table.budgetId, table.categoryId, table.fundId),
    check("budget_lines_planned_check", sql`${table.plannedAmount} >= 0`),
    check("budget_lines_actual_check", sql`${table.actualAmount} >= 0`),
  ],
);
