import { z } from "zod";

import { updatePasswordSchema } from "@/features/auth/schemas";

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(100),
  lastName: z.string().trim().min(1, "Nom requis").max(100),
  phone: z.string().trim().max(30),
  // Fuseau IANA réel : une valeur inventée ferait lever `Intl.DateTimeFormat` partout où l'on formate des dates.
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("fr-FR", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Fuseau horaire invalide"),
  currency: z.enum(["XOF", "XAF", "EUR", "USD"]),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis"),
    password: updatePasswordSchema.shape.password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });
