"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { resourceReservations, resources } from "@/lib/db/schema";
import { reservationSchema, resourceSchema } from "@/features/resources/schemas";

export interface ResourceActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseResourceForm(formData: FormData) {
  return resourceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    location: formData.get("location"),
    status: formData.get("status"),
    capacity: formData.get("capacity"),
    roomType: formData.get("roomType"),
    category: formData.get("category"),
    roomId: formData.get("roomId"),
  });
}

/** Champs propres aux salles / équipements, fusionnés dans `metadata` (les photos existantes sont conservées). */
async function buildMetadata(organizationId: string, existing: unknown, v: ReturnType<typeof resourceSchema.parse>) {
  const meta: Record<string, unknown> = { ...((existing ?? {}) as Record<string, unknown>) };
  const capacity = Number(v.capacity);
  if (v.type === "room") {
    if (Number.isInteger(capacity) && capacity > 0) meta.capacity = capacity;
    else delete meta.capacity;
    if (v.roomType.trim()) meta.roomType = v.roomType.trim();
    else delete meta.roomType;
  } else {
    delete meta.capacity;
    delete meta.roomType;
  }
  if (v.type === "equipment") {
    if (v.category.trim()) meta.category = v.category.trim();
    else delete meta.category;
    if (v.roomId.trim()) {
      const [room] = await db
        .select({ id: resources.id })
        .from(resources)
        .where(and(eq(resources.id, v.roomId.trim()), eq(resources.organizationId, organizationId), eq(resources.type, "room")));
      if (!room) return null;
      meta.roomId = room.id;
    } else delete meta.roomId;
  } else {
    delete meta.category;
    delete meta.roomId;
  }
  return meta;
}

export async function createResource(_prev: ResourceActionState, formData: FormData): Promise<ResourceActionState> {
  const check = await checkPermission("resources.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une ressource." };

  const parsed = parseResourceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const metadata = await buildMetadata(check.organization.organization.id, {}, v);
  if (!metadata) return { error: "Salle d'affectation introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.from("resources").insert({
    metadata,
    organization_id: check.organization.organization.id,
    name: v.name,
    type: v.type,
    description: orNull(v.description),
    quantity: v.quantity ? Number(v.quantity) : 1,
    location: orNull(v.location),
    status: v.status,
  });
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { success: true };
}

export async function updateResource(
  resourceId: string,
  _prev: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const check = await checkPermission("resources.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette ressource." };

  const parsed = parseResourceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const organizationId = check.organization.organization.id;
  const [current] = await db.select({ metadata: resources.metadata }).from(resources).where(and(eq(resources.id, resourceId), eq(resources.organizationId, organizationId)));
  if (!current) return { error: "Ressource introuvable." };
  const metadata = await buildMetadata(organizationId, current.metadata, v);
  if (!metadata) return { error: "Salle d'affectation introuvable." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .update({
      metadata,
      name: v.name,
      type: v.type,
      description: orNull(v.description),
      quantity: v.quantity ? Number(v.quantity) : 1,
      location: orNull(v.location),
      status: v.status,
    })
    .eq("id", resourceId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`) — même contrainte que les
 * autres modules. Les réservations de cette ressource sont supprimées en cascade (FK). */
export async function deleteResource(resourceId: string): Promise<ResourceActionState> {
  const check = await checkPermission("resources.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une ressource." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("id", resourceId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { success: true };
}

export async function createReservation(
  resourceId: string,
  _prev: ResourceActionState,
  formData: FormData,
): Promise<ResourceActionState> {
  const check = await checkPermission("resources.reserve");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de réserver une ressource." };

  const parsed = reservationSchema.safeParse({
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    purpose: formData.get("purpose"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  if (new Date(v.endsAt) <= new Date(v.startsAt)) {
    return { error: "La date de fin doit être après la date de début." };
  }

  const organizationId = check.organization.organization.id;
  const [resource] = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, resourceId), eq(resources.organizationId, organizationId)));
  if (!resource) return { error: "Ressource introuvable." };
  if (resource.status === "maintenance") return { error: "Cette ressource est actuellement en maintenance." };
  if (resource.status === "retired") return { error: "Cette ressource a été retirée du service." };

  // Conflit tenant compte de la quantité : une ressource avec `quantity > 1` (ex. 10 micros)
  // autorise autant de réservations qui se chevauchent que d'unités disponibles — contrairement à
  // la détection de conflits de planning (Phase 7), binaire, qui ne s'applique qu'à un ouvrier
  // (toujours "quantité 1").
  const overlapping = await db
    .select({ id: resourceReservations.id })
    .from(resourceReservations)
    .where(
      and(
        eq(resourceReservations.organizationId, organizationId),
        eq(resourceReservations.resourceId, resourceId),
        ne(resourceReservations.status, "cancelled"),
        sql`${resourceReservations.startsAt} < ${v.endsAt} and ${resourceReservations.endsAt} > ${v.startsAt}`,
      ),
    );
  if (overlapping.length >= resource.quantity) {
    return {
      error: `Aucune unité disponible sur ce créneau (${overlapping.length}/${resource.quantity} déjà réservée(s)).`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("resource_reservations").insert({
    organization_id: organizationId,
    resource_id: resourceId,
    reserved_by_user_id: check.user.id,
    starts_at: v.startsAt,
    ends_at: v.endsAt,
    purpose: orNull(v.purpose),
    status: "pending",
  });
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { success: true };
}

/** Le changement de statut est autorisé au gestionnaire (`resources.manage`/admin) ou au
 * demandeur lui-même sur sa propre réservation (ex. l'annuler) — jamais sur celle d'un tiers. */
export async function updateReservationStatus(reservationId: string, status: string): Promise<ResourceActionState> {
  const check = await checkPermission("resources.reserve");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette réservation." };

  const organizationId = check.organization.organization.id;
  const [reservation] = await db
    .select()
    .from(resourceReservations)
    .where(and(eq(resourceReservations.id, reservationId), eq(resourceReservations.organizationId, organizationId)));
  if (!reservation) return { error: "Réservation introuvable." };

  const canManageAny = check.context.isAdmin || check.context.permissions.has("resources.manage");
  const isOwner = reservation.reservedByUserId === check.user.id;
  if (!canManageAny && !isOwner) {
    return { error: "Vous ne pouvez modifier que vos propres réservations." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resource_reservations")
    .update({ status })
    .eq("id", reservationId)
    .eq("organization_id", organizationId);
  if (error) return { error: error.message };

  revalidatePath("/resources");
  return { success: true };
}
