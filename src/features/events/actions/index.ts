"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { eventCategorySchema, eventSchema } from "@/features/events/schemas";

export interface EventActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createEventCategory(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const check = await checkPermission("events.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une catégorie d'événement." };

  const parsed = eventCategorySchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    icon: formData.get("icon"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("event_categories").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    color: orNull(v.color),
    icon: orNull(v.icon),
    description: orNull(v.description),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Une catégorie avec ce nom existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/events");
  return { success: true };
}

function parseEventForm(formData: FormData) {
  return eventSchema.safeParse({
    title: formData.get("title"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    capacity: formData.get("capacity"),
    visibility: formData.get("visibility"),
    status: formData.get("status"),
    registrationEnabled: formData.get("registrationEnabled") === "on",
    price: formData.get("price"),
  });
}

export async function createEvent(_prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const check = await checkPermission("events.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un événement." };

  const parsed = parseEventForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      organization_id: check.organization.organization.id,
      title: v.title,
      category_id: orNull(v.categoryId),
      description: orNull(v.description),
      starts_at: v.startsAt,
      ends_at: orNull(v.endsAt),
      location: orNull(v.location),
      capacity: v.capacity ? Number(v.capacity) : null,
      visibility: v.visibility,
      status: v.status,
      registration_enabled: v.registrationEnabled,
      price: v.price ? Number(v.price) : 0,
      organizer_user_id: check.user.id,
      created_by: check.user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/events");
  redirect(`/events/${data.id}`);
}

export async function updateEvent(eventId: string, _prev: EventActionState, formData: FormData): Promise<EventActionState> {
  const check = await checkPermission("events.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cet événement." };

  const parsed = parseEventForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({
      title: v.title,
      category_id: orNull(v.categoryId),
      description: orNull(v.description),
      starts_at: v.startsAt,
      ends_at: orNull(v.endsAt),
      location: orNull(v.location),
      capacity: v.capacity ? Number(v.capacity) : null,
      visibility: v.visibility,
      status: v.status,
      registration_enabled: v.registrationEnabled,
      price: v.price ? Number(v.price) : 0,
    })
    .eq("id", eventId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). */
export async function deleteEvent(eventId: string): Promise<EventActionState> {
  const check = await checkPermission("events.delete");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un événement." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/events");
  return { success: true };
}
