import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  customType,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";
import { campuses, organizations } from "./identity-org";
import { people } from "./people";
import { services } from "./ministries";
import {
  attendanceStatus,
  eventStatus,
  eventVisibility,
  paymentStatus,
  registrationStatus,
} from "./enums";

const citext = customType<{ data: string }>({ dataType: () => "citext" });

export const eventCategories = pgTable(
  "event_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    icon: text("icon"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("event_categories_org_name_unique").on(table.organizationId, table.name)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => eventCategories.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug"),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    capacity: integer("capacity"),
    visibility: eventVisibility("visibility").notNull().default("members"),
    status: eventStatus("status").notNull().default("draft"),
    registrationEnabled: boolean("registration_enabled").notNull().default(false),
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
    price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: char("currency", { length: 3 }).notNull().default("XOF"),
    organizerUserId: uuid("organizer_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    imageUrl: text("image_url"),
    metadata: jsonb("metadata").notNull().default({}),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("events_org_slug_unique").on(table.organizationId, table.slug),
    check("events_capacity_check", sql`${table.capacity} is null or ${table.capacity} > 0`),
    check("events_price_check", sql`${table.price} >= 0`),
  ],
);

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    guestName: text("guest_name"),
    guestEmail: citext("guest_email"),
    guestPhone: text("guest_phone"),
    status: registrationStatus("status").notNull().default("pending"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
    paymentStatus: paymentStatus("payment_status"),
    qrToken: text("qr_token").unique(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("event_registrations_amount_check", sql`${table.amount} >= 0`),
    check(
      "event_registrations_attendee_check",
      sql`${table.personId} is not null or ${table.guestName} is not null`,
    ),
  ],
);

export const attendanceSessions = pgTable(
  "attendance_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    location: text("location"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "attendance_sessions_context_check",
      sql`${table.eventId} is not null or ${table.serviceId} is not null`,
    ),
  ],
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => attendanceSessions.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    status: attendanceStatus("status").notNull().default("present"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: uuid("checked_in_by").references(() => authUsers.id, { onDelete: "set null" }),
    method: text("method").notNull().default("manual"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("attendance_records_unique").on(table.sessionId, table.personId)],
);

export const calendarItems = pgTable("calendar_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  allDay: boolean("all_day").notNull().default(false),
  category: text("category"),
  color: text("color"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
