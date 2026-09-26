import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

export const PRAYER_STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  answered: "Exaucé",
  closed: "Clôturé",
  archived: "Archivé",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

export const prayerRequestSchema = z.object({
  personId: optionalString,
  title: z.string().min(1, "Titre requis"),
  description: optionalString,
  category: optionalString,
  status: z.enum(["open", "in_progress", "answered", "closed", "archived"]).default("open"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  isConfidential: z.boolean().default(true),
  assignedToUserId: optionalString,
});
export type PrayerRequestInput = z.infer<typeof prayerRequestSchema>;

export const markAnsweredSchema = z.object({
  answerTestimony: optionalString,
});

export const addPrayerUpdateSchema = z.object({
  content: z.string().min(1, "Contenu requis"),
});
