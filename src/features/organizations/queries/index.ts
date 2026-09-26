import "server-only";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { campuses, organizations } from "@/lib/db/schema";

export async function getOrganizationDetail(organizationId: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
  return org ?? null;
}

export async function getCampuses(organizationId: string) {
  return db
    .select()
    .from(campuses)
    .where(eq(campuses.organizationId, organizationId))
    .orderBy(desc(campuses.isMain), asc(campuses.name));
}
