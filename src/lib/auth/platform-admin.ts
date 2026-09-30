import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db/client";
import { platformAdmins } from "@/lib/db/schema";

/**
 * Lecture de `platform_admins`, isolée dans son propre module pour que `session.ts` puisse
 * l'utiliser sans import circulaire (`platform.ts` dépend de `session.ts`). Mise en cache par
 * requête (`cache`) : le layout, `requireOrganization` et les gardes l'appellent chacun.
 */
export const isPlatformAdmin = cache(async (userId: string): Promise<boolean> => {
  try {
    const [row] = await db
      .select({ userId: platformAdmins.userId })
      .from(platformAdmins)
      .where(eq(platformAdmins.userId, userId));
    return Boolean(row);
  } catch (error) {
    // Table `platform_admins` pas encore appliquée (db/schema.sql) : cette vérification tourne dans
    // le layout de TOUTES les pages, elle ne doit jamais faire tomber l'application. Échec fermé :
    // personne n'est administrateur de plateforme tant que la table n'existe pas.
    console.error("isPlatformAdmin: lecture de platform_admins impossible", error);
    return false;
  }
});
