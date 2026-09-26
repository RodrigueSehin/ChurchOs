import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

export const MINISTRY_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  archived: "Archivé",
};

export const ministrySchema = z.object({
  name: z.string().min(1, "Nom requis"),
  code: optionalString,
  description: optionalString,
  leaderPersonId: optionalString,
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  color: optionalString,
});
export type MinistryInput = z.infer<typeof ministrySchema>;

export const addMinistryMemberSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  role: z.string().min(1).default("member"),
});
