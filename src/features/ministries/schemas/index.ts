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
  category: optionalString,
  description: optionalString,
  leaderPersonId: optionalString,
  status: z.enum(["active", "inactive", "archived"]).default("active"),
  color: optionalString,
});
export type MinistryInput = z.infer<typeof ministrySchema>;

/** Palette déterministe (hash du libellé) pour styliser une catégorie saisie librement par
 * l'utilisateur — purement cosmétique, ne fabrique aucune donnée : seul l'habillage visuel est
 * dérivé, jamais le libellé lui-même. */
const CATEGORY_STYLES = [
  { badge: "bg-purple-100 text-purple-700", dot: "#9333EA" },
  { badge: "bg-blue-100 text-blue-700", dot: "#2563EB" },
  { badge: "bg-amber-100 text-amber-700", dot: "#D97706" },
  { badge: "bg-red-100 text-red-700", dot: "#DC2626" },
  { badge: "bg-green-100 text-green-700", dot: "#16A34A" },
  { badge: "bg-pink-100 text-pink-700", dot: "#DB2777" },
  { badge: "bg-indigo-100 text-indigo-700", dot: "#4F46E5" },
  { badge: "bg-rose-100 text-rose-700", dot: "#E11D48" },
  { badge: "bg-cyan-100 text-cyan-700", dot: "#0891B2" },
];

export function categoryStyle(category: string) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  return CATEGORY_STYLES[hash % CATEGORY_STYLES.length]!;
}

export const addMinistryMemberSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  role: z.string().min(1).default("member"),
});
