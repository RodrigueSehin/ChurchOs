import "server-only";
import { and, asc, count, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { profiles, resourceReservations, resources } from "@/lib/db/schema";

export async function getResources(organizationId: string) {
  const rows = await db
    .select()
    .from(resources)
    .where(eq(resources.organizationId, organizationId))
    .orderBy(asc(resources.type), asc(resources.name));

  const resourceIds = rows.map((r) => r.id);
  const counts = resourceIds.length
    ? await db
        .select({ resourceId: resourceReservations.resourceId, value: count() })
        .from(resourceReservations)
        .where(and(eq(resourceReservations.organizationId, organizationId), ne(resourceReservations.status, "cancelled")))
        .groupBy(resourceReservations.resourceId)
    : [];
  const countByResource = new Map(counts.map((c) => [c.resourceId, c.value]));

  return rows.map((r) => ({ ...r, reservationCount: countByResource.get(r.id) ?? 0 }));
}

export async function getResourceReservations(organizationId: string, resourceId: string) {
  return db
    .select({
      id: resourceReservations.id,
      startsAt: resourceReservations.startsAt,
      endsAt: resourceReservations.endsAt,
      purpose: resourceReservations.purpose,
      status: resourceReservations.status,
      reservedByUserId: resourceReservations.reservedByUserId,
      requesterName: profiles.displayName,
    })
    .from(resourceReservations)
    .leftJoin(profiles, eq(profiles.id, resourceReservations.reservedByUserId))
    .where(and(eq(resourceReservations.organizationId, organizationId), eq(resourceReservations.resourceId, resourceId)))
    .orderBy(asc(resourceReservations.startsAt));
}
