import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const PASTORAL_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
  archived: "Archivé",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

/** Voir docs/architecture/03-multi-tenancy-and-rls.md#confidentialité-pastorale-durcie-en-phase-6 :
 * `normal` = visible par tout membre de l'organisation, `pastoral` = réservé à
 * `pastoral.view_confidential` (+ créateur/assigné/admin), `restricted` = jamais accordé par la
 * permission, seulement créateur/assigné/admin. */
export const CONFIDENTIALITY_LABELS: Record<string, string> = {
  normal: "Normal",
  pastoral: "Pastoral (confidentiel)",
  restricted: "Restreint (très confidentiel)",
};

export const pastoralFollowupSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  title: z.string().min(1, "Titre requis"),
  description: optionalString,
  status: z.enum(["new", "in_progress", "waiting", "completed", "cancelled", "archived"]).default("new"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueDate: optionalDate,
  nextAction: optionalString,
  confidentiality: z.enum(["normal", "pastoral", "restricted"]).default("pastoral"),
  assignedToUserId: optionalString,
});
export type PastoralFollowupInput = z.infer<typeof pastoralFollowupSchema>;

export const addNoteSchema = z.object({
  note: z.string().min(1, "Note requise"),
  isPrivate: z.boolean().default(true),
});
