import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const datetimeString = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure requises");

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  room: "Salle",
  equipment: "Équipement",
  vehicle: "Véhicule",
  other: "Autre",
};

export const RESOURCE_STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  maintenance: "En maintenance",
  retired: "Retiré",
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};

/** Types de salle (affichés en pastille colorée, `metadata.roomType`). */
export const ROOM_TYPES = ["Culte", "Prière", "Réunion", "Formation", "Jeunesse", "Enfants", "Événement"] as const;
export const ROOM_TYPE_STYLES: Record<string, string> = {
  Culte: "bg-blue-100 text-blue-700",
  Prière: "bg-purple-100 text-purple-700",
  Réunion: "bg-sky-100 text-sky-700",
  Formation: "bg-green-100 text-green-700",
  Jeunesse: "bg-fuchsia-100 text-fuchsia-700",
  Enfants: "bg-orange-100 text-orange-700",
  Événement: "bg-teal-100 text-teal-700",
};

/** Catégories d'équipement (`metadata.category`). */
export const EQUIPMENT_CATEGORIES = ["Sono", "Écrans", "Microphones", "Climatisation", "Projecteur", "Chaises", "Tables", "Autres"] as const;

/**
 * Champs propres aux salles / équipements, rangés dans `resources.metadata` (aucune migration) :
 * salle → `capacity`, `roomType`, `photos` ; équipement → `category`, `roomId` (salle où il est installé).
 */
export interface ResourceMeta {
  capacity: number | null;
  roomType: string | null;
  photos: string[];
  category: string | null;
  roomId: string | null;
}

export function readMeta(metadata: unknown): ResourceMeta {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return {
    capacity: typeof m.capacity === "number" && m.capacity > 0 ? m.capacity : null,
    roomType: str(m.roomType),
    photos: Array.isArray(m.photos) ? m.photos.filter((p): p is string => typeof p === "string" && /^https?:\/\//.test(p)) : [],
    category: str(m.category),
    roomId: str(m.roomId),
  };
}

export const resourceSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.enum(["room", "equipment", "vehicle", "other"]).default("room"),
  description: optionalString,
  quantity: optionalString,
  location: optionalString,
  status: z.enum(["available", "maintenance", "retired"]).default("available"),
  capacity: optionalString,
  roomType: optionalString,
  category: optionalString,
  roomId: optionalString,
});
export type ResourceInput = z.infer<typeof resourceSchema>;

export const reservationSchema = z.object({
  startsAt: datetimeString,
  endsAt: datetimeString,
  purpose: optionalString,
});
export type ReservationInput = z.infer<typeof reservationSchema>;
