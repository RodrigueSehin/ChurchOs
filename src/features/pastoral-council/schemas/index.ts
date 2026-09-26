import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const COUNCIL_STATUS_LABELS: Record<string, string> = {
  planned: "Planifiée",
  held: "Tenue",
  cancelled: "Annulée",
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  new: "Nouvelle",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminée",
  cancelled: "Annulée",
  archived: "Archivée",
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  present: "Présent",
  absent: "Absent",
  excused: "Excusé",
  late: "En retard",
};

const councilStatus = z
  .enum(["planned", "held", "cancelled"])
  .nullish()
  .transform((v) => v ?? "planned");
const actionStatus = z
  .enum(["new", "in_progress", "waiting", "completed", "cancelled", "archived"])
  .nullish()
  .transform((v) => v ?? "new");

export const councilSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  meetingAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Date et heure requises"),
  location: optionalString,
  agenda: optionalString,
  minutes: optionalString,
  status: councilStatus,
});
export type CouncilInput = z.infer<typeof councilSchema>;

export const councilMemberSchema = z
  .object({
    personId: optionalString,
    userId: optionalString,
    attendanceStatus: optionalString,
  })
  .refine((v) => v.personId || v.userId, { message: "Choisissez une personne ou un utilisateur", path: ["personId"] });

export const councilActionSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: optionalString,
  assignedToUserId: optionalString,
  dueDate: optionalDate,
  status: actionStatus,
});
