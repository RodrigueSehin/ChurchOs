import "server-only";
import { asc, eq } from "drizzle-orm";

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
