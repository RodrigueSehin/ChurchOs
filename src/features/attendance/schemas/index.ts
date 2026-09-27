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
