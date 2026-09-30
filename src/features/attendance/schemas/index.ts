import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDateTime = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: "Présent",
  absent: "Absent",
  excused: "Excusé",
  late: "En retard",
};

export const ATTENDANCE_SOURCE_LABELS: Record<string, string> = {
  event: "Événement",
  service: "Service",
};

/** Dérivé de la session liée, jamais une colonne stockée. `attendance_sessions_context_check`
 * impose qu'une session ait toujours un `event_id` et/ou un `service_id` — il n'existe donc pas de
 * session "purement manuelle" ; "les deux" est possible (rare) et compte ici comme "event" pour
 * l'affichage d'un badge unique. */
export function attendanceSourceOf(row: { eventId: string | null; serviceId: string | null }): "event" | "service" {
  return row.eventId ? "event" : "service";
}

export const attendanceSessionSchema = z
  .object({
    title: z.string().min(1, "Titre requis"),
    eventId: optionalString,
    serviceId: optionalString,
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure requises"),
    endsAt: optionalDateTime,
    location: optionalString,
  })
  .refine((v) => v.eventId || v.serviceId, {
    message: "Rattachez la session à un événement ou un service",
    path: ["eventId"],
  });
export type AttendanceSessionInput = z.infer<typeof attendanceSessionSchema>;

export const markAttendanceSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  status: z.enum(["present", "absent", "excused", "late"]).default("present"),
});
