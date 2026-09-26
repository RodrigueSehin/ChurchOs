import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  integer,
  jsonb,
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
import { documentVisibility, reservationStatus, resourceType } from "./enums";

export const documentFolders = pgTable(
  "document_folders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => documentFolders.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    visibility: documentVisibility("visibility").notNull().default("organization"),
    createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("document_folders_unique").on(table.organizationId, table.parentId, table.name),
  ],
);

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  folderId: uuid("folder_id").references(() => documentFolders.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  storageBucket: text("storage_bucket").notNull().default("churchos-documents"),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  visibility: documentVisibility("visibility").notNull().default("organization"),
  uploadedBy: uuid("uploaded_by").references(() => authUsers.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    campusId: uuid("campus_id").references(() => campuses.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    type: resourceType("type").notNull(),
    description: text("description"),
    quantity: integer("quantity").notNull().default(1),
    location: text("location"),
    status: text("status").notNull().default("available"),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("resources_quantity_check", sql`${table.quantity} > 0`),
    check("resources_status_check", sql`${table.status} in ('available','maintenance','retired')`),
  ],
);

export const resourceReservations = pgTable(
  "resource_reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    reservedByUserId: uuid("reserved_by_user_id").references(() => authUsers.id, {
      onDelete: "set null",
    }),
    reservedByPersonId: uuid("reserved_by_person_id").references(() => people.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    purpose: text("purpose"),
    status: reservationStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("resource_reservations_time_check", sql`${table.endsAt} > ${table.startsAt}`),
    check(
      "resource_reservations_reserver_check",
      sql`${table.reservedByUserId} is not null or ${table.reservedByPersonId} is not null`,
    ),
  ],
);
