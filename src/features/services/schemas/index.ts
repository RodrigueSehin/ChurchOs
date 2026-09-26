import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDateTime = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const SERVICE_STATUS_LABELS: Record<string, string> = {
  planned: "Planifié",
  confirmed: "Confirmé",
  completed: "Terminé",
  cancelled: "Annulé",
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, string> = {
  assigned: "Affecté",
  confirmed: "Confirmé",
  declined: "Décliné",
  completed: "Terminé",
  cancelled: "Annulé",
};

export const serviceTypeSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  description: optionalString,
  defaultDurationMinutes: optionalString,
});

export const serviceSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  serviceTypeId: optionalString,
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure de début requises"),
  endsAt: optionalDateTime,
  location: optionalString,
  notes: optionalString,
  status: z.enum(["planned", "confirmed", "completed", "cancelled"]).default("planned"),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const serviceAssignmentSchema = z.object({
  workerId: z.string().min(1, "Ouvrier requis"),
  role: z.string().min(1, "Rôle requis"),
  notes: optionalString,
});
