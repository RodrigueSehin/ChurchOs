import "server-only";
import { and, asc, count, eq, gte, lt, ne } from "drizzle-orm";

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

export type ResourceRowData = Awaited<ReturnType<typeof getResources>>[number];

export interface ReservationEntry {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceType: string;
  startsAt: Date;
  endsAt: Date;
  purpose: string | null;
  status: string;
  reservedByUserId: string | null;
  requesterName: string | null;
}

/** Réservations (avec ressource et demandeur) dont le créneau chevauche [from, to[. */
export async function getReservationsBetween(organizationId: string, from: Date, to: Date): Promise<ReservationEntry[]> {
  return db
    .select({
      id: resourceReservations.id,
      resourceId: resourceReservations.resourceId,
      resourceName: resources.name,
      resourceType: resources.type,
      startsAt: resourceReservations.startsAt,
      endsAt: resourceReservations.endsAt,
      purpose: resourceReservations.purpose,
      status: resourceReservations.status,
      reservedByUserId: resourceReservations.reservedByUserId,
      requesterName: profiles.displayName,
    })
    .from(resourceReservations)
    .innerJoin(resources, eq(resources.id, resourceReservations.resourceId))
    .leftJoin(profiles, eq(profiles.id, resourceReservations.reservedByUserId))
    .where(and(eq(resourceReservations.organizationId, organizationId), lt(resourceReservations.startsAt, to), gte(resourceReservations.endsAt, from)))
    .orderBy(asc(resourceReservations.startsAt));
}

export interface RoomView {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  /** Statut affiché : « Réservée » = une réservation active couvre l'instant présent. */
  displayStatus: "available" | "reserved" | "maintenance" | "retired" | "draft";
  capacity: number | null;
  roomType: string | null;
  photos: string[];
  /** Équipements cochés dans le formulaire de la salle + catégories des équipements qui y sont installés (sans doublon). */
  amenities: string[];
  equipment: { id: string; name: string; category: string | null; quantity: number }[];
  upcoming: ReservationEntry[];
}

const DAY = 24 * 3600_000;
const DAY_HOURS = 12; // plage d'ouverture retenue pour le taux d'occupation (8 h – 20 h)

function hoursWithin(r: { startsAt: Date; endsAt: Date }, from: number, to: number) {
  const start = Math.max(r.startsAt.getTime(), from);
  const end = Math.min(r.endsAt.getTime(), to);
  return end > start ? (end - start) / 3600_000 : 0;
}

/** Données de la page « Salles & équipements » : salles enrichies, équipements, réservations et KPI. */
export async function getResourcesOverview(organizationId: string, canManage: boolean) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

  const [allRows, reservations] = await Promise.all([
    getResources(organizationId),
    // 60 jours en arrière (taux d'occupation, mois précédent) jusqu'à 1 an devant (réservations à venir).
    getReservationsBetween(organizationId, new Date(now.getTime() - 62 * DAY), new Date(now.getTime() + 365 * DAY)),
  ]);

  // Les brouillons ne sont visibles que des gestionnaires et ne comptent dans aucun indicateur.
  const all = canManage ? allRows : allRows.filter((r) => r.status !== "draft");
  const live = all.filter((r) => r.status !== "draft");
  const active = reservations.filter((r) => r.status !== "cancelled");
  const roomRows = all.filter((r) => r.type === "room");
  const otherRows = all.filter((r) => r.type !== "room");
  const liveRooms = live.filter((r) => r.type === "room");
  const liveOthers = live.filter((r) => r.type !== "room");

  const rooms: RoomView[] = roomRows.map((room) => {
    const mine = active.filter((r) => r.resourceId === room.id);
    const busyNow = mine.some((r) => r.startsAt <= now && r.endsAt > now);
    const displayStatus = room.status === "draft" ? "draft" : room.status === "maintenance" ? "maintenance" : room.status === "retired" ? "retired" : busyNow ? "reserved" : "available";
    const installed = otherRows.filter((e) => e.roomId === room.id);
    return {
      id: room.id,
      name: room.name,
      description: room.description,
      location: room.location,
      displayStatus,
      capacity: room.capacity,
      roomType: room.roomType,
      photos: room.photos,
      amenities: [...new Set([...room.amenities, ...installed.map((e) => e.category).filter((c): c is string => Boolean(c))])],
      equipment: installed.map((e) => ({ id: e.id, name: e.name, category: e.category, quantity: e.quantity })),
      upcoming: mine.filter((r) => r.endsAt > now).slice(0, 3),
    };
  });

  const inMonth = (r: ReservationEntry, from: Date, to: Date) => r.startsAt >= from && r.startsAt < to;
  const thisMonth = active.filter((r) => inMonth(r, monthStart, nextMonthStart)).length;
  const lastMonth = active.filter((r) => inMonth(r, prevMonthStart, monthStart)).length;

  // Taux d'occupation : heures réservées des salles sur 30 jours / (salles en service × 30 j × 12 h).
  const usableRooms = liveRooms.filter((r) => r.status === "available").length;
  const roomIds = new Set(liveRooms.map((r) => r.id));
  const occupancy = (from: number, to: number) => {
    if (usableRooms === 0) return null;
    const hours = active.filter((r) => roomIds.has(r.resourceId)).reduce((sum, r) => sum + hoursWithin(r, from, to), 0);
    return Math.min(100, Math.round((hours / (usableRooms * ((to - from) / DAY) * DAY_HOURS)) * 100));
  };
  const nowMs = now.getTime();
  const occupancyNow = occupancy(nowMs - 30 * DAY, nowMs);
  const occupancyBefore = occupancy(nowMs - 60 * DAY, nowMs - 30 * DAY);

  const createdThisMonth = (rows: ResourceRowData[]) => rows.filter((r) => r.createdAt >= monthStart);
  return {
    rooms,
    equipment: otherRows,
    roomNames: new Map(roomRows.map((r) => [r.id, r.name])),
    reservations: reservations.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()),
    kpis: {
      rooms: { value: liveRooms.length, delta: createdThisMonth(liveRooms).length },
      equipment: { value: liveOthers.reduce((s, r) => s + r.quantity, 0), delta: createdThisMonth(liveOthers).reduce((s, r) => s + r.quantity, 0) },
      reservations: { value: thisMonth, growthPct: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null },
      occupancy: { value: occupancyNow, delta: occupancyNow !== null && occupancyBefore !== null ? occupancyNow - occupancyBefore : null },
    },
  };
}

