import { z } from "zod";

// `.nullish()` + `.transform(v => v ?? "")` (pas `.optional().default("")`) : `FormData.get()`
// renvoie `null` pour une clé absente, et `.default()` seul ne se déclenche que sur `undefined`.
const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalEmail = z
  .union([z.string().email("Email invalide"), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");
const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const visitorFormSchema = z.object({
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  email: optionalEmail,
  phone: optionalString,
  source: optionalString,
  firstVisitDate: optionalDate,
  invitedByPersonId: optionalString,
  followUpDate: optionalDate,
  notes: optionalString,
});
export type VisitorFormInput = z.infer<typeof visitorFormSchema>;

export const VISITOR_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  follow_up: "À relancer",
  connected: "Intégré",
  converted: "Devenu membre",
  lost: "Perdu de vue",
  archived: "Archivé",
};
