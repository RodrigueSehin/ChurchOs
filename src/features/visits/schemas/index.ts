import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");
const optionalDateTime = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const VISIT_TYPE_LABELS: Record<string, string> = {
  pastoral: "Visite pastorale",
  member: "Visite de membre",
  family: "Visite de famille",
  hospital: "Visite à l'hôpital",
  home: "Visite à domicile",
  new_visitor: "Visite de nouveau visiteur",
  other: "Autre",
};

export const VISIT_STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminée",
  cancelled: "Annulée",
  archived: "Archivée",
};

export const visitSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  visitType: z.enum(["pastoral", "member", "family", "hospital", "home", "new_visitor", "other"]).default("pastoral"),
  scheduledAt: optionalDateTime,
  location: optionalString,
  assignedToUserId: optionalString,
  status: z.enum(["new", "in_progress", "waiting", "completed", "cancelled", "archived"]).default("new"),
  purpose: optionalString,
  summary: optionalString,
  nextAction: optionalString,
  nextActionDate: optionalDate,
});
export type VisitInput = z.infer<typeof visitSchema>;
