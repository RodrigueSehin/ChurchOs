import { pgSchema, timestamp, uuid, text } from "drizzle-orm/pg-core";

/**
 * Référence typée vers `auth.users`, géré par Supabase Auth (Phase 3) — jamais créé/modifié par
 * nos migrations Drizzle. `drizzle.config.ts` restreint `drizzle-kit generate`/`push` au schéma
 * `public` (schemaFilter) : cette table ne sert qu'à typer les clés étrangères `users.id`, plus
 * quelques colonnes en lecture seule utiles à l'app (email, dernière connexion — ex. liste des
 * membres en `features/rbac`). `DATABASE_URL` se connecte avec un rôle qui a accès à `auth` (voir
 * `lib/db/client.ts`) ; jamais utilisé en écriture depuis Drizzle sur cette table.
 */
export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  lastSignInAt: timestamp("last_sign_in_at", { withTimezone: true }),
});
