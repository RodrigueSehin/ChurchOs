import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, serviceAssignments, serviceTypes, services, workers } from "@/lib/db/schema";

export async function getServiceTypes(organizationId: string) {
  return db
    .select()
    .from(serviceTypes)
    .where(and(eq(serviceTypes.organizationId, organizationId), eq(serviceTypes.isActive, true)))
    .orderBy(asc(serviceTypes.name));
}

export async function getServices(organizationId: string) {
  return db
    .select({
      id: services.id,
      title: services.title,
      startsAt: services.startsAt,
      endsAt: services.endsAt,
      location: services.location,
      status: services.status,
      serviceTypeId: services.serviceTypeId,
      serviceTypeName: serviceTypes.name,
    })
    .from(services)
    .leftJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
    .where(eq(services.organizationId, organizationId))
    .orderBy(desc(services.startsAt));
}

export async function getServiceAssignments(organizationId: string, serviceId: string) {
  return db
    .select({
      id: serviceAssignments.id,
      workerId: serviceAssignments.workerId,
      role: serviceAssignments.role,
      status: serviceAssignments.status,
      notes: serviceAssignments.notes,
      firstName: people.firstName,
      lastName: people.lastName,
    })
    .from(serviceAssignments)
    .innerJoin(workers, eq(workers.id, serviceAssignments.workerId))
    .innerJoin(people, eq(people.id, workers.personId))
    .where(and(eq(serviceAssignments.serviceId, serviceId), eq(serviceAssignments.organizationId, organizationId)))
    .orderBy(asc(people.firstName));
}
