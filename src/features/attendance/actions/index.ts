"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { attendanceSessionSchema, markAttendanceSchema } from "@/features/attendance/schemas";

export interface AttendanceActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createAttendanceSession(_prev: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  const check = await checkPermission("attendance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une session de présence." };

  const parsed = attendanceSessionSchema.safeParse({
    title: formData.get("title"),
    eventId: formData.get("eventId"),
    serviceId: formData.get("serviceId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("attendance_sessions").insert({
    organization_id: check.organization.organization.id,
    title: v.title,
    event_id: orNull(v.eventId),
    service_id: orNull(v.serviceId),
    starts_at: v.startsAt,
    ends_at: orNull(v.endsAt),
    location: orNull(v.location),
    created_by: check.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/attendance");
  return { success: true };
}

export async function markAttendance(sessionId: string, _prev: AttendanceActionState, formData: FormData): Promise<AttendanceActionState> {
  const check = await checkPermission("attendance.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'enregistrer une présence." };

  const parsed = markAttendanceSchema.safeParse({
    personId: formData.get("personId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("attendance_records").upsert(
    {
      organization_id: check.organization.organization.id,
      session_id: sessionId,
      person_id: v.personId,
      status: v.status,
      checked_in_at: new Date().toISOString(),
      checked_in_by: check.user.id,
      method: "manual",
    },
    { onConflict: "session_id,person_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/attendance");
  return { success: true };
}
