import { sql } from "drizzle-orm";
import { bigint, date, integer, pgTable, primaryKey, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";
import { organizations } from "./identity-org";

export const libraryCategories = pgTable(
  "library_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("library_categories_org_name_unique").on(table.organizationId, table.name)],
);

export const libraryResources = pgTable("library_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => libraryCategories.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  resourceType: text("resource_type").notNull(),
  author: text("author"),
  publishedOn: date("published_on"),
  publisher: text("publisher"),
  description: text("description").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name"),
  fileMime: text("file_mime"),
  fileSize: bigint("file_size", { mode: "number" }),
  coverUrl: text("cover_url"),
  visibility: text("visibility").notNull().default("members"),
  status: text("status").notNull().default("published"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  viewCount: integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const libraryBookmarks = pgTable(
  "library_bookmarks",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => libraryResources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.userId] })],
);

export const libraryRatings = pgTable(
  "library_ratings",
  {
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => libraryResources.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.userId] })],
);
