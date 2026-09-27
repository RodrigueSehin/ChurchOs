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

export const resourceSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  type: z.enum(["room", "equipment", "vehicle", "other"]).default("room"),
  description: optionalString,
  quantity: optionalString,
  location: optionalString,
  status: z.enum(["available", "maintenance", "retired"]).default("available"),
});
export type ResourceInput = z.infer<typeof resourceSchema>;

export const reservationSchema = z.object({
  startsAt: datetimeString,
  endsAt: datetimeString,
  purpose: optionalString,
});
export type ReservationInput = z.infer<typeof reservationSchema>;
