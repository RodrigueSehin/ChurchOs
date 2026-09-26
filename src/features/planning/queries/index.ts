import "server-only";
import { and, asc, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, planningSlots, workers } from "@/lib/db/schema";

export async function getPlanningSlots({ organizationId, search }: { organizationId: string; search?: string }) {
  const conditions = [eq(planningSlots.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(planningSlots.title, term), ilike(people.firstName, term), ilike(people.lastName, term))!);
  }
  const where = and(...conditions);

  return db
    .select({
      id: planningSlots.id,
      title: planningSlots.title,
      category: planningSlots.category,
      startsAt: planningSlots.startsAt,
      endsAt: planningSlots.endsAt,
      location: planningSlots.location,
      status: planningSlots.status,
      notes: planningSlots.notes,
      assignedToWorkerId: planningSlots.assignedToWorkerId,
      workerFirstName: people.firstName,
      workerLastName: people.lastName,
    })
    .from(planningSlots)
    .leftJoin(workers, eq(workers.id, planningSlots.assignedToWorkerId))
    .leftJoin(people, eq(people.id, workers.personId))
    .where(where)
    .orderBy(asc(planningSlots.startsAt));
}
