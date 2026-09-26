import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  customType,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";
import { memberStatus, orgStatus } from "./enums";

/** Extension `citext` (insensible à la casse), utilisée par `organizations.slug`. */
const citext = customType<{ data: string }>({ dataType: () => "citext" });

export const profiles = pgTable("profiles", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  firstName: text("first_name"),
  lastName: text("last_name"),
  displayName: text("display_name"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  locale: text("locale").notNull().default("fr"),
  timezone: text("timezone").notNull().default("Africa/Abidjan"),
  currency: text("currency").notNull().default("XOF"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  slug: citext("slug").notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  region: text("region"),
  countryCode: char("country_code", { length: 2 }).notNull().default("CI"),
  postalCode: text("postal_code"),
  timezone: text("timezone").notNull().default("Africa/Abidjan"),
  currency: char("currency", { length: 3 }).notNull().default("XOF"),
  locale: text("locale").notNull().default("fr"),
  status: orgStatus("status").notNull().default("trial"),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campuses = pgTable(
  "campuses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: text("code"),
    description: text("description"),
    email: text("email"),
    phone: text("phone"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    countryCode: char("country_code", { length: 2 }).notNull().default("CI"),
    timezone: text("timezone"),
    isMain: boolean("is_main").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("campuses_org_name_unique").on(table.organizationId, table.name),
    unique("campuses_org_code_unique").on(table.organizationId, table.code),
  ],
);

export const organizationSettings = pgTable(
  "organization_settings",
  {
    organizationId: uuid("organization_id")
      .primaryKey()
      .references(() => organizations.id, { onDelete: "cascade" }),
    dateFormat: text("date_format").notNull().default("dd/MM/yyyy"),
    weekStartsOn: smallint("week_starts_on").notNull().default(1),
    defaultCampusId: uuid("default_campus_id").references(() => campuses.id, {
      onDelete: "set null",
    }),
    defaultMemberStatus: memberStatus("default_member_status").notNull().default("active"),
    allowPublicRegistrations: boolean("allow_public_registrations").notNull().default(true),
    requireRegistrationConfirmation: boolean("require_registration_confirmation")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("organization_settings_week_starts_on_check", sql`${table.weekStartsOn} between 0 and 6`),
  ],
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    title: text("title"),
    status: text("status").notNull().default("active"),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("organization_memberships_unique").on(table.organizationId, table.userId),
    check(
      "organization_memberships_status_check",
      sql`${table.status} in ('invited','active','suspended','left')`,
    ),
  ],
);
