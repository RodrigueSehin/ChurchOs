import { z } from "zod";

// `.nullish()` + `.transform(v => v ?? "")` (pas `.optional().default("")`) : `FormData.get()`
// renvoie `null` pour une clé absente, et `.default()` seul ne se déclenche que sur `undefined`.
const optionalString = z.string().nullish().transform((v) => v ?? "");

export const GROUP_TYPE_LABELS: Record<string, string> = {
  cell: "Cellule",
  home_group: "Groupe à domicile",
  youth: "Jeunesse",
  women: "Femmes",
  men: "Hommes",
  children: "Enfants",
  prayer: "Prière",
  study: "Étude biblique",
  team: "Équipe",
  custom: "Autre",
};

export const SERVICE_DAY_LABELS: Record<string, string> = {
  "0": "Dimanche",
  "1": "Lundi",
  "2": "Mardi",
  "3": "Mercredi",
  "4": "Jeudi",
  "5": "Vendredi",
  "6": "Samedi",
};

export const groupSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  code: optionalString,
  type: z.enum(["cell", "home_group", "youth", "women", "men", "children", "prayer", "study", "team", "custom"]).default("custom"),
  description: optionalString,
  leaderPersonId: optionalString,
  meetingDay: optionalString,
  meetingTime: optionalString,
  meetingLocation: optionalString,
  capacity: optionalString,
});
export type GroupInput = z.infer<typeof groupSchema>;

export const addGroupMemberSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  role: z.string().min(1).default("member"),
});
