import "server-only";
import { type SQL, eq, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Reproduit, côté Drizzle, exactement la même logique que les policies RLS de
 * `db/schema.sql` (§20, section "Confidentialité pastorale") — voir
 * docs/architecture/03-multi-tenancy-and-rls.md#confidentialité-pastorale-durcie-en-phase-6.
 *
 * Nécessaire car `DATABASE_URL` (utilisé par Drizzle) se connecte avec un rôle qui CONTOURNE
 * RLS (voir docs/architecture/03-multi-tenancy-and-rls.md) : sans ce filtre applicatif, les
 * listes/lectures via Drizzle montreraient les enregistrements confidentiels à tout le monde,
 * même si un accès direct à l'API Supabase (qui passe par RLS) les bloquerait correctement.
 */

export interface ConfidentialityContext {
  userId: string;
  isAdmin: boolean;
  canViewConfidential: boolean;
}

/** Pour une colonne booléenne `is_confidential` / `is_private` (prayer_requests, pastoral_notes). */
export function confidentialBooleanFilter(
  ctx: ConfidentialityContext,
  isConfidentialCol: AnyPgColumn,
  createdByCol: AnyPgColumn,
  assignedToCol?: AnyPgColumn,
): SQL {
  if (ctx.isAdmin || ctx.canViewConfidential) {
    return sql`true`;
  }
  const conditions = [sql`${isConfidentialCol} = false`, eq(createdByCol, ctx.userId)];
  if (assignedToCol) conditions.push(eq(assignedToCol, ctx.userId));
  return or(...conditions)!;
}

/** Pour la colonne à 3 niveaux `confidentiality` (pastoral_followups) — `restricted` n'est
 * jamais couvert par `pastoral.view_confidential`, seulement créateur/assigné/admin. */
export function confidentialityLevelFilter(
  ctx: ConfidentialityContext,
  confidentialityCol: AnyPgColumn,
  createdByCol: AnyPgColumn,
  assignedToCol?: AnyPgColumn,
): SQL {
  const own = [eq(createdByCol, ctx.userId)];
  if (assignedToCol) own.push(eq(assignedToCol, ctx.userId));

  if (ctx.isAdmin) return sql`true`;

  const conditions = [sql`${confidentialityCol} = 'normal'`, ...own];
  if (ctx.canViewConfidential) conditions.push(sql`${confidentialityCol} = 'pastoral'`);
  return or(...conditions)!;
}
