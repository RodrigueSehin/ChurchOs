import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./identity-org";
import { people } from "./people";
import { courseStatus, enrollmentStatus } from "./enums";

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: courseStatus("status").notNull().default("draft"),
  instructorPersonId: uuid("instructor_person_id").references(() => people.id, {
    onDelete: "set null",
  }),
  imageUrl: text("image_url"),
  durationMinutes: integer("duration_minutes"),
  category: text("category"),
  level: text("level"),
  prerequisites: text("prerequisites"),
  publishedAt: date("published_at"),
  allowEnrollment: boolean("allow_enrollment").notNull().default(true),
  showInLibrary: boolean("show_in_library").notNull().default(true),
  coInstructorIds: uuid("co_instructor_ids").array().notNull().default(sql`'{}'::uuid[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courseCategories = pgTable(
  "course_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("course_categories_org_name_unique").on(table.organizationId, table.name)],
);

export const courseModules = pgTable("course_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
  content: jsonb("content").notNull().default({}),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    status: enrollmentStatus("status").notNull().default("enrolled"),
    progress: numeric("progress", { precision: 5, scale: 2 }).notNull().default("0"),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    unique("course_enrollments_unique").on(table.courseId, table.personId),
    check("course_enrollments_progress_check", sql`${table.progress} between 0 and 100`),
  ],
);

export const certifications = pgTable(
  "certifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    certificateNumber: text("certificate_number"),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    credentialUrl: text("credential_url"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("certifications_org_number_unique").on(table.organizationId, table.certificateNumber),
  ],
);
