import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

export const WORKER_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  on_leave: "En congé",
  archived: "Archivé",
};

export const workerSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  workerNumber: optionalString,
  status: z.enum(["active", "inactive", "on_leave", "archived"]).default("active"),
  skills: optionalString,
  notes: optionalString,
});
export type WorkerInput = z.infer<typeof workerSchema>;

export function skillsToArray(skills: string): string[] {
  return skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function skillsToText(skills: unknown): string {
  return Array.isArray(skills) ? skills.join(", ") : "";
}
