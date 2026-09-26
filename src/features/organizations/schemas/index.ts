import { z } from "zod";

// `.nullish()` + `.transform(v => v ?? "")` (pas `.optional().default("")`) : `FormData.get()`
// renvoie `null` — pas `undefined` — pour une clé absente, et `.default()` seul ne se déclenche
// que sur `undefined` (vécu en conditions réelles : `null` passait tel quel, cassant le typage
// et `safeParse` dès qu'un champ optionnel n'était pas rendu dans le formulaire).
const optionalString = () => z.string().nullish().transform((v) => v ?? "");
const optionalEmail = () =>
  z
    .union([z.string().email("Email invalide"), z.literal("")])
    .nullish()
    .transform((v) => v ?? "");
const optionalUrl = () =>
  z
    .union([z.string().url("URL invalide"), z.literal("")])
    .nullish()
    .transform((v) => v ?? "");

export const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  legalName: optionalString(),
  description: optionalString(),
  email: optionalEmail(),
  phone: optionalString(),
  website: optionalUrl(),
  logoUrl: optionalUrl(),
  addressLine1: optionalString(),
  city: optionalString(),
  region: optionalString(),
  countryCode: z.string().length(2, "Pays requis"),
  postalCode: optionalString(),
  timezone: z.string().min(1, "Fuseau horaire requis"),
  currency: z.string().length(3, "Devise requise"),
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const campusSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  code: optionalString(),
  email: optionalEmail(),
  phone: optionalString(),
  addressLine1: optionalString(),
  city: optionalString(),
});
export type CampusInput = z.infer<typeof campusSchema>;
