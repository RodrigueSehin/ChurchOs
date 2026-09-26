import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  customType,
  date,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";
import { campuses, organizations } from "./identity-org";
import { gender, memberStatus, relationshipType, visitorStatus } from "./enums";

const citext = customType<{ data: string }>({ dataType: () => "citext" });

export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  email: citext("email"),
  phone: text("phone"),
  secondaryPhone: text("secondary_phone"),
  gender: gender("gender").notNull().default("undisclosed"),
  birthDate: date("birth_date"),
  maritalStatus: text("marital_status"),
  occupation: text("occupation"),
  photoUrl: text("photo_url"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  region: text("region"),
  countryCode: char("country_code", { length: 2 }).default("CI"),
  postalCode: text("postal_code"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  notes: text("notes"),
  isDeceased: boolean("is_deceased").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .unique()
      .references(() => people.id, { onDelete: "cascade" }),
    memberNumber: text("member_number"),
    status: memberStatus("status").notNull().default("active"),
    membershipDate: date("membership_date"),
    baptismDate: date("baptism_date"),
    salvationDate: date("salvation_date"),
    previousChurch: text("previous_church"),
    department: text("department"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("members_org_number_unique").on(table.organizationId, table.memberNumber)],
);

export const families = pgTable(
  "families",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    familyCode: text("family_code"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    countryCode: char("country_code", { length: 2 }).default("CI"),
    postalCode: text("postal_code"),
    primaryContactPersonId: uuid("primary_contact_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("families_org_code_unique").on(table.organizationId, table.familyCode)],
);

export const familyMembers = pgTable(
  "family_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    relationshipToHead: text("relationship_to_head"),
    isHead: boolean("is_head").notNull().default(false),
    isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("family_members_unique").on(table.familyId, table.personId)],
);

export const personRelationships = pgTable(
  "person_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    relatedPersonId: uuid("related_person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    relationship: relationshipType("relationship").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("person_relationships_distinct_check", sql`${table.personId} <> ${table.relatedPersonId}`),
    unique("person_relationships_unique").on(
      table.personId,
      table.relatedPersonId,
      table.relationship,
    ),
  ],
);

export const visitors = pgTable("visitors", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  firstVisitDate: date("first_visit_date").notNull().defaultNow(),
  source: text("source"),
  invitedByPersonId: uuid("invited_by_person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  assignedToUserId: uuid("assigned_to_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  status: visitorStatus("status").notNull().default("new"),
  convertedToMemberId: uuid("converted_to_member_id").references(() => members.id, {
    onDelete: "set null",
  }),
  followUpDate: date("follow_up_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
