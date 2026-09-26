import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDateTime = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const PLANNING_STATUS_LABELS: Record<string, string> = {
  assigned: "Affecté",
  confirmed: "Confirmé",
  declined: "Décliné",
  completed: "Terminé",
  cancelled: "Annulé",
};

export const planningSlotSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  category: optionalString,
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure de début requises"),
  endsAt: optionalDateTime,
  location: optionalString,
  assignedToWorkerId: optionalString,
  status: z.enum(["assigned", "confirmed", "declined", "completed", "cancelled"]).default("assigned"),
  notes: optionalString,
});
export type PlanningSlotInput = z.infer<typeof planningSlotSchema>;
