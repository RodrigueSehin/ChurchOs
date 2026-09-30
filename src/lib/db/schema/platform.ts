import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { authUsers } from "./auth-ref";

/** Administrateurs de la plateforme ChurchOS (vue `/platform`). Voir db/schema.sql : RLS activée
 * sans politique, lue uniquement côté serveur via `requirePlatformAdmin()`. */
export const platformAdmins = pgTable("platform_admins", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => authUsers.id, { onDelete: "set null" }),
});
