"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { eventRegistrations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateQrCodeDataUrl, generateQrToken } from "@/lib/qr/generate";
import { registrationSchema } from "@/features/registrations/schemas";

export interface RegistrationActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createRegistration(_prev: RegistrationActionState, formData: FormData): Promise<RegistrationActionState> {
  const check = await checkPermission("registrations.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une inscription." };

  const parsed = registrationSchema.safeParse({
    eventId: formData.get("eventId"),
    personId: formData.get("personId"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: formData.get("guestPhone"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("event_registrations").insert({
    organization_id: check.organization.organization.id,
    event_id: v.eventId,
    person_id: orNull(v.personId),
    guest_name: v.personId ? null : orNull(v.guestName),
    guest_email: orNull(v.guestEmail),
    guest_phone: orNull(v.guestPhone),
    status: v.status,
    qr_token: generateQrToken(),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Cette personne est déjà inscrite à cet événement." };
    }
    return { error: error.message };
  }

  revalidatePath("/registrations");
  return { success: true };
}

export async function getRegistrationQrCode(registrationId: string): Promise<{ dataUrl?: string; error?: string }> {
  const check = await checkPermission("registrations.view");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de voir ce QR code." };

  const [row] = await db
    .select({ qrToken: eventRegistrations.qrToken, organizationId: eventRegistrations.organizationId })
    .from(eventRegistrations)
    .where(eq(eventRegistrations.id, registrationId));
  if (!row || row.organizationId !== check.organization.organization.id || !row.qrToken) {
    return { error: "Inscription introuvable." };
  }

  return { dataUrl: await generateQrCodeDataUrl(row.qrToken) };
}

/** Réservé aux admins — `registrations` n'a pas de permission `.delete` dédiée (seules `.view`/
 * `.create`/`.update` existent, voir `lib/rbac/permissions.ts`), même convention que la suppression
 * d'un événement. */
export async function deleteRegistration(registrationId: string): Promise<RegistrationActionState> {
  const check = await checkPermission("registrations.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une inscription." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_registrations")
    .delete()
    .eq("id", registrationId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/registrations");
  return { success: true };
}

export async function updateRegistrationStatus(registrationId: string, status: string): Promise<RegistrationActionState> {
  const check = await checkPermission("registrations.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette inscription." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "confirmed") patch.confirmed_at = new Date().toISOString();
  if (status === "cancelled") patch.cancelled_at = new Date().toISOString();

  const { error } = await supabase
    .from("event_registrations")
    .update(patch)
    .eq("id", registrationId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/registrations");
  return { success: true };
}
