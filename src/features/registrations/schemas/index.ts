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

export const REGISTRATION_STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#16a34a",
  waitlisted: "#64748b",
  cancelled: "#dc2626",
  attended: "#2563eb",
  no_show: "#ea580c",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  succeeded: "Payé",
  failed: "Échoué",
  refunded: "Remboursé",
  cancelled: "Annulé",
};

/** "Gratuit" quand le montant dû est nul — `payment_status` n'a pas de valeur pour ce cas puisqu'il
 * n'y a alors rien à payer (colonne nullable, jamais renseignée pour une inscription gratuite). */
export function paymentLabelFor(amount: string, paymentStatus: string | null): string {
  if (Number(amount) <= 0) return "Gratuit";
  if (!paymentStatus) return "En attente";
  return PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus;
}

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
