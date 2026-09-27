import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  waitlisted: "Liste d'attente",
  cancelled: "Annulée",
  attended: "Présent",
  no_show: "Absent",
};

export const registrationSchema = z
  .object({
    eventId: z.string().min(1, "Événement requis"),
    personId: optionalString,
    guestName: optionalString,
    guestEmail: optionalString,
    guestPhone: optionalString,
    status: z
      .enum(["pending", "confirmed", "waitlisted", "cancelled", "attended", "no_show"])
      .nullish()
      .transform((v) => v ?? "pending"),
  })
  .refine((v) => v.personId || v.guestName, {
    message: "Choisissez une personne ou renseignez le nom d'un invité",
    path: ["personId"],
  });
export type RegistrationInput = z.infer<typeof registrationSchema>;
