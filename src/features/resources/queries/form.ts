import "server-only";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { people, resources } from "@/lib/db/schema";

/** Salles (pour l'affectation d'un équipement) et personnes (responsable) proposées par le formulaire d'équipement. */
export async function getEquipmentFormOptions(organizationId: string) {
  const [rooms, persons] = await Promise.all([
    db
      .select({ id: resources.id, name: resources.name })
      .from(resources)
      .where(and(eq(resources.organizationId, organizationId), eq(resources.type, "room")))
      .orderBy(asc(resources.name)),
    db
      .select({ id: people.id, firstName: people.firstName, lastName: people.lastName })
      .from(people)
      .where(eq(people.organizationId, organizationId))
      .orderBy(asc(people.lastName), asc(people.firstName))
      .limit(1000),
  ]);
  return { rooms, people: persons.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}` })) };
}

export async function getResourceForEdit(organizationId: string, id: string) {
  const [row] = await db.select().from(resources).where(and(eq(resources.id, id), eq(resources.organizationId, organizationId)));
  return row ?? null;
}

/** Sonde : échoue (colonne inexistante) tant que la migration des formulaires n'est pas appliquée. */
export async function probeResourceColumns(organizationId: string) {
  await db.select({ capacity: resources.capacity, photos: resources.photos, condition: resources.condition }).from(resources).where(eq(resources.organizationId, organizationId)).limit(1);
}
