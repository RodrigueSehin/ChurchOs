import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const datetimeString = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure requises");
const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  room: "Salle",
  equipment: "Équipement",
  vehicle: "Véhicule",
  other: "Autre",
};

export const RESOURCE_STATUS_LABELS: Record<string, string> = {
  available: "Disponible",
  maintenance: "En maintenance",
  retired: "Indisponible",
  draft: "Brouillon",
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
  completed: "Terminée",
};

/** Types de salle (pastille colorée). */
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

/** Localisations proposées pour une salle. */
export const ROOM_LOCATIONS = ["Rez-de-chaussée", "1er étage", "2ème étage", "3ème étage", "Sous-sol", "Annexe", "Extérieur"] as const;

export const RESERVABLE_BY_LABELS: Record<string, string> = {
  members: "Tous les membres",
  leaders: "Responsables uniquement",
  admins: "Administrateurs uniquement",
};

/** Équipements cochables d'une salle (mêmes libellés que les catégories d'équipement). */
export const AMENITIES = ["Sono", "Écrans / TV", "Projecteur", "Microphones", "Climatisation", "Chaises", "Tables", "Estrade", "Pupitre", "Tableau blanc", "Connexion Internet", "Autres équipements"] as const;
export const EQUIPMENT_CATEGORIES = AMENITIES;

export const CONDITION_LABELS: Record<string, string> = {
  new: "Neuf",
  good: "En bon état",
  worn: "Usé",
  to_repair: "À réparer",
  out_of_service: "Hors service",
};
export const CONDITION_STYLES: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  good: "bg-success/10 text-success",
  worn: "bg-amber-100 text-amber-700",
  to_repair: "bg-orange-100 text-orange-700",
  out_of_service: "bg-red-100 text-red-600",
};

export const RESOURCE_PHOTO_BUCKET = "churchos-resources";
export const RESOURCE_DOC_BUCKET = "churchos-resource-docs";
export const RESOURCE_FILE_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const DOC_MIME_EXTENSIONS: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" };
export const MAX_PHOTOS = 8;
export const MAX_DOCUMENTS = 5;

/** Chemin Storage d'une photo de NOTRE bucket public (sinon `null`). */
export function resourcePhotoPath(url: string | null | undefined) {
  const marker = `/object/public/${RESOURCE_PHOTO_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export interface ResourceDocument {
  path: string;
  name: string;
  mime: string;
  size: number;
}

const status = z.enum(["available", "maintenance", "retired"]);

export const roomSchema = z.object({
  name: z.string().trim().min(1, "Le nom de la salle est requis.").max(100, "Nom : 100 caractères maximum"),
  description: z.string().trim().max(500, "Description : 500 caractères maximum").default(""),
  roomType: z.enum(ROOM_TYPES, { message: "Le type de salle est requis." }),
  capacity: z.coerce.number({ message: "La capacité est requise." }).int("Capacité invalide.").min(1, "La capacité doit être d'au moins 1.").max(100000, "Capacité trop élevée."),
  location: z.string().trim().min(1, "La localisation est requise.").max(100),
  status,
  reservableBy: z.enum(["members", "leaders", "admins"]),
  allowReservations: z.boolean(),
  requiresApproval: z.boolean(),
  publicCalendar: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)).default([]),
  internalNotes: z.string().trim().max(500, "Notes : 500 caractères maximum").default(""),
  /** `draft` : enregistre sans mettre en service (statut « Brouillon »). */
  mode: z.enum(["draft", "create"]),
});
export type RoomInput = z.infer<typeof roomSchema>;

export const equipmentSchema = z.object({
  name: z.string().trim().min(1, "Le nom de l'équipement est requis.").max(100, "Nom : 100 caractères maximum"),
  category: z.enum(EQUIPMENT_CATEGORIES, { message: "La catégorie est requise." }),
  quantity: z.coerce.number().int().min(1, "Quantité : au moins 1.").max(100000).default(1),
  description: z.string().trim().max(500, "Description : 500 caractères maximum").default(""),
  brand: z.string().trim().max(100).default(""),
  model: z.string().trim().max(100).default(""),
  serialNumber: z.string().trim().max(100).default(""),
  condition: z.enum(["new", "good", "worn", "to_repair", "out_of_service"], { message: "L'état actuel est requis." }),
  purchaseDate: optionalDate,
  purchaseValue: z.string().trim().default(""),
  roomId: z.string().default(""),
  responsiblePersonId: z.string().default(""),
  warrantyEnd: optionalDate,
  supplier: z.string().trim().max(150).default(""),
  invoiceReference: z.string().trim().max(100).default(""),
  mode: z.enum(["draft", "create"]),
});
export type EquipmentInput = z.infer<typeof equipmentSchema>;

export const reservationSchema = z.object({
  startsAt: datetimeString,
  endsAt: datetimeString,
  purpose: optionalString,
});
export type ReservationInput = z.infer<typeof reservationSchema>;
