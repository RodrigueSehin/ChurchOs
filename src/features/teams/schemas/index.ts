import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

export const TEAM_MEMBER_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  on_leave: "En congé",
  archived: "Archivé",
};

export const teamSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  description: optionalString,
  ministryId: optionalString,
  leaderPersonId: optionalString,
});
export type TeamInput = z.infer<typeof teamSchema>;

export const addTeamMemberSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  role: z.string().min(1).default("member"),
  status: z.enum(["active", "inactive", "on_leave", "archived"]).default("active"),
});
