import "server-only";
import { and, asc, eq, isNotNull, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people } from "@/lib/db/schema";

/** Liste légère de personnes pour peupler un `<select>` (responsable de groupe, contact
 * principal d'une famille, "invité par"...) — pas de recherche serveur ici, la volumétrie d'une
 * église reste gérable pour un select natif ; à revoir avec un vrai combobox si besoin. */
export async function getPeopleForSelect(organizationId: string) {
  const rows = await db
    .select({ id: people.id, firstName: people.firstName, lastName: people.lastName })
    .from(people)
    .where(eq(people.organizationId, organizationId))
    .orderBy(asc(people.lastName), asc(people.firstName))
    .limit(1000);
  return rows.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` }));
}

/** Même liste, mais seulement les personnes ayant un email — pour peupler les cases à cocher de
 * destinataires d'une campagne de communication (canal email uniquement cette phase). */
export async function getPeopleWithEmailForSelect(organizationId: string) {
  const rows = await db
    .select({ id: people.id, firstName: people.firstName, lastName: people.lastName, email: people.email })
    .from(people)
    .where(and(eq(people.organizationId, organizationId), isNotNull(people.email), ne(people.email, "")))
    .orderBy(asc(people.lastName), asc(people.firstName))
    .limit(1000);
  return rows.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email! }));
}
