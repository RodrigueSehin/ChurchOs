import "server-only";
import { and, asc, count, eq, ilike, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, planningSlots, workers } from "@/lib/db/schema";

const PLANNING_STATUSES = ["assigned", "confirmed", "declined", "completed", "cancelled"] as const;

export async function getPlanningSlots({ organizationId, search, status }: { organizationId: string; search?: string; status?: string }) {
  const conditions = [eq(planningSlots.organizationId, organizationId)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(or(ilike(planningSlots.title, term), ilike(people.firstName, term), ilike(people.lastName, term))!);
  }
  if (status && (PLANNING_STATUSES as readonly string[]).includes(status)) {
    conditions.push(eq(planningSlots.status, status as (typeof PLANNING_STATUSES)[number]));
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

export async function getPlanningTabCounts(organizationId: string) {
  const [[all], perStatus] = await Promise.all([
    db.select({ value: count() }).from(planningSlots).where(eq(planningSlots.organizationId, organizationId)),
    db.select({ status: planningSlots.status, value: count() }).from(planningSlots).where(eq(planningSlots.organizationId, organizationId)).groupBy(planningSlots.status),
  ]);
  const byStatus = new Map(perStatus.map((r) => [r.status, r.value]));
  return {
    all: all?.value ?? 0,
    assigned: byStatus.get("assigned") ?? 0,
    confirmed: byStatus.get("confirmed") ?? 0,
    completed: byStatus.get("completed") ?? 0,
    cancelled: byStatus.get("cancelled") ?? 0,
    declined: byStatus.get("declined") ?? 0,
  };
}

export async function getPlanningKpis(organizationId: string) {
  const [[total], [confirmed], [pending]] = await Promise.all([
    db.select({ value: count() }).from(planningSlots).where(eq(planningSlots.organizationId, organizationId)),
    db
      .select({ value: count() })
      .from(planningSlots)
      .where(and(eq(planningSlots.organizationId, organizationId), eq(planningSlots.status, "confirmed"))),
    db
      .select({ value: count() })
      .from(planningSlots)
      .where(and(eq(planningSlots.organizationId, organizationId), eq(planningSlots.status, "assigned"))),
  ]);
  return {
    total: total?.value ?? 0,
    confirmed: confirmed?.value ?? 0,
    pending: pending?.value ?? 0,
  };
}
