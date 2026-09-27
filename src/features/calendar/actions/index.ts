"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { calendarItemSchema } from "@/features/calendar/schemas";

export interface CalendarActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createCalendarItem(_prev: CalendarActionState, formData: FormData): Promise<CalendarActionState> {
  const check = await checkPermission("calendar.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une entrée de calendrier." };

  const parsed = calendarItemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    category: formData.get("category"),
    color: formData.get("color"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("calendar_items").insert({
    organization_id: check.organization.organization.id,
    title: v.title,
    description: orNull(v.description),
    starts_at: v.startsAt,
    ends_at: orNull(v.endsAt),
    category: orNull(v.category),
    color: orNull(v.color),
    created_by: check.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). */
export async function deleteCalendarItem(itemId: string): Promise<CalendarActionState> {
  const check = await checkPermission("calendar.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une entrée de calendrier." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_items")
    .delete()
    .eq("id", itemId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/calendar");
  return { success: true };
}
