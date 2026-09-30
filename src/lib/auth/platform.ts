import "server-only";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/lib/db/client";
import { platformAdmins } from "@/lib/db/schema";
import { getCurrentUser, requireUser, type CurrentUser } from "./session";

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: platformAdmins.userId })
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, userId));
  return Boolean(row);
}

/** Variante sans redirection, pour afficher/masquer un lien (ex. menu latéral). */
export async function getPlatformAdminUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  return (await isPlatformAdmin(user.id)) ? user : null;
}

/**
 * Garde de la vue d'administration globale. Toute page `/platform/*` ET toute Server Action
 * `features/platform` doit l'appeler en premier — c'est le seul contrôle d'accès (la RLS ne
 * couvre pas ces lectures inter-organisations, Drizzle la contourne par construction).
 * Un utilisateur non-admin reçoit un 404 : on ne révèle pas l'existence de la vue.
 */
export async function requirePlatformAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!(await isPlatformAdmin(user.id))) notFound();
  return user;
}
