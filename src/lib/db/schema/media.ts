import { bigint, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";
import { organizations } from "./identity-org";

export const mediaItems = pgTable("media_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  filePath: text("file_path").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  tags: text("tags").array().notNull().default([]),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaYoutubeChannels = pgTable("media_youtube_channels", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  channelId: text("channel_id").notNull(),
  channelTitle: text("channel_title").notNull(),
  channelHandle: text("channel_handle"),
  uploadsPlaylistId: text("uploads_playlist_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
