import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDateTime = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const EVENT_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  cancelled: "Annulé",
  completed: "Terminé",
  archived: "Archivé",
};

export const EVENT_VISIBILITY_LABELS: Record<string, string> = {
  private: "Privé",
  members: "Membres",
  public: "Public",
};

export const eventCategorySchema = z.object({
  name: z.string().min(1, "Nom requis"),
  color: optionalString,
  icon: optionalString,
  description: optionalString,
});

export const eventSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  categoryId: optionalString,
  description: optionalString,
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure de début requises"),
  endsAt: optionalDateTime,
  location: optionalString,
  capacity: optionalString,
  visibility: z.enum(["private", "members", "public"]).default("members"),
  status: z.enum(["draft", "published", "cancelled", "completed", "archived"]).default("draft"),
  registrationEnabled: z.boolean().default(false),
  price: optionalString,
});
export type EventInput = z.infer<typeof eventSchema>;
