import { sql } from "drizzle-orm";
import { boolean, check, date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";
import { campuses, organizations } from "./identity-org";
import { people, visitors } from "./people";
import {
  attendanceStatus,
  pastoralStatus,
  priorityLevel,
  prayerStatus,
  visitType,
} from "./enums";

export const pastoralFollowups = pgTable(
  "pastoral_followups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    assignedToUserId: uuid("assigned_to_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: pastoralStatus("status").notNull().default("new"),
    priority: priorityLevel("priority").notNull().default("normal"),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    nextAction: text("next_action"),
    confidentiality: text("confidentiality").notNull().default("pastoral"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "pastoral_followups_confidentiality_check",
      sql`${table.confidentiality} in ('normal','pastoral','restricted')`,
    ),
  ],
);

export const pastoralNotes = pgTable("pastoral_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  followupId: uuid("followup_id")
    .notNull()
    .references(() => pastoralFollowups.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  note: text("note").notNull(),
  isPrivate: boolean("is_private").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prayerRequests = pgTable("prayer_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
  personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  status: prayerStatus("status").notNull().default("open"),
  priority: priorityLevel("priority").notNull().default("normal"),
  isConfidential: boolean("is_confidential").notNull().default(true),
  assignedToUserId: uuid("assigned_to_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  answerTestimony: text("answer_testimony"),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const prayerUpdates = pgTable("prayer_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  prayerRequestId: uuid("prayer_request_id")
    .notNull()
    .references(() => prayerRequests.id, { onDelete: "cascade" }),
  authorUserId: uuid("author_user_id").references(() => authUsers.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
  personId: uuid("person_id")
    .notNull()
    .references(() => people.id, { onDelete: "cascade" }),
  visitorId: uuid("visitor_id").references(() => visitors.id, { onDelete: "set null" }),
  visitType: visitType("visit_type").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  location: text("location"),
  assignedToUserId: uuid("assigned_to_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  status: pastoralStatus("status").notNull().default("new"),
  purpose: text("purpose"),
  summary: text("summary"),
  nextAction: text("next_action"),
  nextActionDate: date("next_action_date"),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pastoralCouncils = pgTable(
  "pastoral_councils",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    meetingAt: timestamp("meeting_at", { withTimezone: true }).notNull(),
    location: text("location"),
    agenda: text("agenda"),
    minutes: text("minutes"),
    status: text("status").notNull().default("planned"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("pastoral_councils_status_check", sql`${table.status} in ('planned','held','cancelled')`),
  ],
);

export const pastoralCouncilMembers = pgTable(
  "pastoral_council_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    councilId: uuid("council_id")
      .notNull()
      .references(() => pastoralCouncils.id, { onDelete: "cascade" }),
    personId: uuid("person_id").references(() => people.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "set null" }),
    attendanceStatus: attendanceStatus("attendance_status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "pastoral_council_members_person_check",
      sql`${table.personId} is not null or ${table.userId} is not null`,
    ),
  ],
);

export const pastoralActions = pgTable("pastoral_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  councilId: uuid("council_id").references(() => pastoralCouncils.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  assignedToUserId: uuid("assigned_to_user_id").references(() => authUsers.id, {
    onDelete: "set null",
  }),
  dueDate: date("due_date"),
  status: pastoralStatus("status").notNull().default("new"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
