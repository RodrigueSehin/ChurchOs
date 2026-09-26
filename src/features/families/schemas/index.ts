import { z } from "zod";

// `.nullish()` + `.transform(v => v ?? "")` (pas `.optional().default("")`) : `FormData.get()`
// renvoie `null` pour une clé absente, et `.default()` seul ne se déclenche que sur `undefined`.
const optionalString = z.string().nullish().transform((v) => v ?? "");

export const familySchema = z.object({
  name: z.string().min(1, "Nom requis"),
  familyCode: optionalString,
  addressLine1: optionalString,
  city: optionalString,
  primaryContactPersonId: optionalString,
  notes: optionalString,
});
export type FamilyInput = z.infer<typeof familySchema>;

export const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: "Conjoint(e)",
  parent: "Parent",
  child: "Enfant",
  sibling: "Frère/Sœur",
  grandparent: "Grand-parent",
  grandchild: "Petit-enfant",
  guardian: "Tuteur",
  dependent: "Dépendant",
  other: "Autre",
};

export const addFamilyMemberSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  relationshipToHead: optionalString,
  isHead: z.boolean().default(false),
  isPrimaryContact: z.boolean().default(false),
});
export type AddFamilyMemberInput = z.infer<typeof addFamilyMemberSchema>;
