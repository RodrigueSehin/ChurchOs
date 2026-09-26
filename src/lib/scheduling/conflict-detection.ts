import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { planningSlots, serviceAssignments, services } from "@/lib/db/schema";

/**
 * Détection de conflits de planning (critère de sortie de la Phase 7) : un même ouvrier
 * (`workers.id`) ne peut pas être affecté à deux créneaux qui se chevauchent, que ce soit deux
 * `service_assignments` (via `services.starts_at/ends_at`), deux `planning_slots`, ou un mélange
 * des deux — ces deux tables sont les deux façons dont un ouvrier peut être "occupé".
 *
 * Une fin de créneau non renseignée (`ends_at` nul, autorisé par le schéma) est traitée comme une
 * durée par défaut de 2h à partir du début, pour que la détection reste utile même sur des
 * créneaux incomplets plutôt que de les ignorer silencieusement.
 */

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export interface SchedulingConflict {
  source: "service" | "planning";
  title: string;
  startsAt: Date;
  endsAt: Date | null;
}

function effectiveEnd(startsAt: Date, endsAt: Date | null): Date {
  return endsAt ?? new Date(startsAt.getTime() + DEFAULT_DURATION_MS);
}

export async function findWorkerConflicts(params: {
  organizationId: string;
  workerId: string;
  startsAt: Date;
  endsAt: Date | null;
  excludeServiceAssignmentId?: string;
  excludePlanningSlotId?: string;
}): Promise<SchedulingConflict[]> {
  const newStart = params.startsAt;
  const newEnd = effectiveEnd(params.startsAt, params.endsAt);

  const serviceConflicts = await db
    .select({ title: services.title, startsAt: services.startsAt, endsAt: services.endsAt })
    .from(serviceAssignments)
    .innerJoin(services, eq(services.id, serviceAssignments.serviceId))
    .where(
      and(
        eq(serviceAssignments.organizationId, params.organizationId),
        eq(serviceAssignments.workerId, params.workerId),
        ne(serviceAssignments.status, "cancelled"),
        params.excludeServiceAssignmentId ? ne(serviceAssignments.id, params.excludeServiceAssignmentId) : undefined,
        sql`${services.startsAt} < ${newEnd} and coalesce(${services.endsAt}, ${services.startsAt} + interval '2 hours') > ${newStart}`,
      ),
    );

  const planningConflicts = await db
    .select({ title: planningSlots.title, startsAt: planningSlots.startsAt, endsAt: planningSlots.endsAt })
    .from(planningSlots)
    .where(
      and(
        eq(planningSlots.organizationId, params.organizationId),
        eq(planningSlots.assignedToWorkerId, params.workerId),
        ne(planningSlots.status, "cancelled"),
        params.excludePlanningSlotId ? ne(planningSlots.id, params.excludePlanningSlotId) : undefined,
        sql`${planningSlots.startsAt} < ${newEnd} and coalesce(${planningSlots.endsAt}, ${planningSlots.startsAt} + interval '2 hours') > ${newStart}`,
      ),
    );

  return [
    ...serviceConflicts.map((c) => ({ source: "service" as const, ...c })),
    ...planningConflicts.map((c) => ({ source: "planning" as const, ...c })),
  ];
}

export function formatConflictMessage(conflicts: SchedulingConflict[]): string {
  const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const list = conflicts.map((c) => `« ${c.title} » (${fmt.format(c.startsAt)})`).join(", ");
  return `Conflit de planning : cet ouvrier est déjà affecté à ${list}.`;
}
