import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDateTime = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const CALENDAR_SOURCE_LABELS: Record<string, string> = {
  event: "Événement",
  service: "Service",
  planning: "Planning",
  manual: "Autre",
};

export const calendarItemSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: optionalString,
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure de début requises"),
  endsAt: optionalDateTime,
  category: optionalString,
  color: optionalString,
});
export type CalendarItemInput = z.infer<typeof calendarItemSchema>;
