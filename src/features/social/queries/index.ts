import "server-only";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { socialConnections } from "@/lib/db/schema";

/** Comptes connectés, SANS le jeton (qui ne quitte jamais le serveur). */
export async function getSocialConnections(organizationId: string) {
  return db
    .select({
      id: socialConnections.id,
      provider: socialConnections.provider,
      label: socialConnections.label,
      externalId: socialConnections.externalId,
      createdAt: socialConnections.createdAt,
    })
    .from(socialConnections)
    .where(eq(socialConnections.organizationId, organizationId))
    .orderBy(asc(socialConnections.provider), asc(socialConnections.label));
}
