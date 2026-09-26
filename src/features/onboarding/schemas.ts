import { z } from "zod";

export const churchInfoSchema = z.object({
  churchName: z.string().min(2, "Nom de l'église requis"),
  slug: z
    .string()
    .min(2, "Identifiant requis")
    .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
  denomination: z.string().optional().default(""),
  countryCode: z.string().length(2, "Pays requis"),
  city: z.string().min(1, "Ville requise"),
  address: z.string().optional().default(""),
  churchPhone: z.string().min(6, "Téléphone requis"),
  churchEmail: z.string().email("Adresse email invalide"),
  website: z
    .union([z.string().url("URL invalide"), z.literal("")])
    .optional()
    .default(""),
  timezone: z.string().min(1, "Fuseau horaire requis"),
});
export type ChurchInfoInput = z.infer<typeof churchInfoSchema>;

export const createAdminSchema = z
  .object({
    firstName: z.string().min(1, "Prénom requis"),
    lastName: z.string().min(1, "Nom requis"),
    phone: z.string().min(6, "Téléphone requis"),
    email: z.string().email("Adresse email invalide"),
    role: z.string().min(1, "Rôle requis"),
    password: z
      .string()
      .min(8, "8 caractères minimum")
      .regex(/[A-Z]/, "Une lettre majuscule requise")
      .regex(/[a-z]/, "Une lettre minuscule requise")
      .regex(/[0-9]/, "Un chiffre requis")
      .regex(/[^A-Za-z0-9]/, "Un caractère spécial requis"),
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", { message: "Vous devez accepter les conditions" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
