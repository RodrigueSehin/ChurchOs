import { z } from "zod";

// `.nullish()` (pas `.optional()`) : `FormData.get()` renvoie `null` — pas `undefined` — pour
// une clé absente (champ non rendu dans le formulaire, ou décoché). Et `.transform(v => v ?? "")`
// plutôt que `.default("")` : `.default()` ne se déclenche que sur `undefined`, pas sur `null`
// (vécu en conditions réelles : `.nullish().default("")` laissait passer `null` tel quel).
const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalEmail = z
  .union([z.string().email("Email invalide"), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");
const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const memberFormSchema = z.object({
  // Personne (public.people)
  firstName: z.string().min(1, "Prénom requis"),
  lastName: z.string().min(1, "Nom requis"),
  preferredName: optionalString,
  email: optionalEmail,
  phone: optionalString,
  gender: z.enum(["male", "female", "other", "undisclosed"]).default("undisclosed"),
  birthDate: optionalDate,
  maritalStatus: optionalString,
  occupation: optionalString,
  addressLine1: optionalString,
  city: optionalString,
  campusId: optionalString,
  emergencyContactName: optionalString,
  emergencyContactPhone: optionalString,
  notes: optionalString,

  // Adhésion (public.members)
  status: z.enum(["active", "inactive", "transferred", "deceased", "archived"]).default("active"),
  membershipDate: optionalDate,
  baptismDate: optionalDate,
  salvationDate: optionalDate,
  previousChurch: optionalString,
  department: optionalString,
});
export type MemberFormInput = z.infer<typeof memberFormSchema>;

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  transferred: "Transféré",
  deceased: "Décédé",
  archived: "Archivé",
};

export const GENDER_LABELS: Record<string, string> = {
  male: "Homme",
  female: "Femme",
  other: "Autre",
  undisclosed: "Non précisé",
};
