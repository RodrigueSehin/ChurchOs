import "server-only";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db } from "@/lib/db/client";
import { organizationMemberships, organizations, profiles } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isPlatformAdmin } from "./platform-admin";

export interface CurrentUser {
  id: string;
  email: string;
  profile: typeof profiles.$inferSelect | null;
  /** Compte créé par un administrateur avec un mot de passe temporaire : le changement est obligatoire. */
  mustChangePassword: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id));
  return {
    id: user.id,
    email: user.email ?? "",
    profile: profile ?? null,
    mustChangePassword: user.user_metadata?.must_change_password === true,
  };
}

/** Redirige vers /login si pas de session — le middleware le fait déjà pour les pages,
 * mais une Server Action peut être appelée hors navigation normale. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getActiveMemberships(userId: string) {
  return db
    .select({ membership: organizationMemberships, organization: organizations })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(
      and(eq(organizationMemberships.userId, userId), eq(organizationMemberships.status, "active")),
    );
}

/**
 * Organisation "courante" pour cet utilisateur. `organization_memberships` n'a pas de
 * notion de "primaire" dans le schéma réel (voir docs/architecture/02-database-schema.md) —
 * on prend la première appartenance active. Un sélecteur multi-organisation (cookie de
 * préférence) est une amélioration future, pas nécessaire pour l'onboarding/auth de la
 * Phase 3 où un utilisateur n'a généralement qu'une seule organisation.
 */
export async function getCurrentOrganization(userId: string) {
  const memberships = await getActiveMemberships(userId);
  return memberships[0] ?? null;
}

/**
 * Atteindre ce guard suppose déjà une session (appelé après `requireUser()`) — donc l'étape 2
 * de l'onboarding (création du compte) est forcément déjà passée. On renvoie vers l'étape 3
 * (`configuration`), pas vers `/onboarding/church` : sinon un utilisateur qui revient plus
 * tard (nouvel onglet après confirmation email, session expirée puis reconnexion...) serait
 * renvoyé au tout début et retomberait sur "compte déjà existant" à l'étape 2.
 */
export async function requireOrganization(userId: string) {
  const current = await getCurrentOrganization(userId);
  if (!current) redirect("/onboarding/configuration");
  // Église suspendue depuis `/platform` : accès bloqué pour pages ET Server Actions (toutes
  // passent par ici). Les administrateurs de la plateforme restent exemptés.
  if (current.organization.status === "suspended") {
    const admin = await isPlatformAdmin(userId);
    if (!admin) redirect("/suspended");
  }
  return current;
}
