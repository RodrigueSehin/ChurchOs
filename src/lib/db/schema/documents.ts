import { sql } from "drizzle-orm";
import {
  bigint,
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
    // Salle
    capacity: integer("capacity"),
    roomType: text("room_type"),
    amenities: text("amenities").array().notNull().default(sql`'{}'`),
    reservableBy: text("reservable_by").notNull().default("members"),
    allowReservations: boolean("allow_reservations").notNull().default(true),
    requiresApproval: boolean("requires_approval").notNull().default(true),
    publicCalendar: boolean("public_calendar").notNull().default(false),
    internalNotes: text("internal_notes"),
    // Équipement
    category: text("category"),
    brand: text("brand"),
    model: text("model"),
    serialNumber: text("serial_number"),
    condition: text("condition"),
    purchaseDate: date("purchase_date"),
    purchaseValue: numeric("purchase_value", { precision: 14, scale: 0, mode: "number" }),
    roomId: uuid("room_id").references((): AnyPgColumn => resources.id, { onDelete: "set null" }),
    responsiblePersonId: uuid("responsible_person_id").references(() => people.id, { onDelete: "set null" }),
    warrantyEnd: date("warranty_end"),
    supplier: text("supplier"),
    invoiceReference: text("invoice_reference"),
    // Communs
    photos: text("photos").array().notNull().default(sql`'{}'`),
    documents: jsonb("documents").$type<{ path: string; name: string; mime: string; size: number }[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("resources_quantity_check", sql`${table.quantity} > 0`),
    check("resources_status_check", sql`${table.status} in ('available','maintenance','retired','draft')`),
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
