"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { services } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { findWorkerConflicts, formatConflictMessage } from "@/lib/scheduling/conflict-detection";
import { serviceAssignmentSchema, serviceSchema, serviceTypeSchema } from "@/features/services/schemas";

export interface ServiceActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createServiceType(_prev: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  const check = await checkPermission("services.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un type de service." };

  const parsed = serviceTypeSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    defaultDurationMinutes: formData.get("defaultDurationMinutes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("service_types").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    description: orNull(v.description),
    default_duration_minutes: v.defaultDurationMinutes ? Number(v.defaultDurationMinutes) : null,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un type de service avec ce nom existe déjà." };
    }
    return { error: error.message };
  }

  revalidatePath("/services");
  return { success: true };
}

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    title: formData.get("title"),
    serviceTypeId: formData.get("serviceTypeId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    location: formData.get("location"),
    notes: formData.get("notes"),
    status: formData.get("status"),
  });
}

export async function createService(_prev: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  const check = await checkPermission("services.create");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un service." };

  const parsed = parseServiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    organization_id: check.organization.organization.id,
    service_type_id: orNull(v.serviceTypeId),
    title: v.title,
    starts_at: v.startsAt,
    ends_at: orNull(v.endsAt),
    location: orNull(v.location),
    notes: orNull(v.notes),
    status: v.status,
    created_by: check.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/services");
  return { success: true };
}

export async function updateService(serviceId: string, _prev: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  const check = await checkPermission("services.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce service." };

  const parsed = parseServiceForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      service_type_id: orNull(v.serviceTypeId),
      title: v.title,
      starts_at: v.startsAt,
      ends_at: orNull(v.endsAt),
      location: orNull(v.location),
      notes: orNull(v.notes),
      status: v.status,
    })
    .eq("id", serviceId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/services");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`). */
export async function deleteService(serviceId: string): Promise<ServiceActionState> {
  const check = await checkPermission("services.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un service." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .delete()
    .eq("id", serviceId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/services");
  return { success: true };
}

/** Détection de conflits de planning (critère de sortie de la Phase 7, voir
 * `lib/scheduling/conflict-detection.ts`) : refuse l'affectation si l'ouvrier est déjà occupé
 * (autre service ou créneau de planning) sur le même créneau horaire. */
export async function addServiceAssignment(
  serviceId: string,
  _prev: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  const check = await checkPermission("services.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce service." };

  const parsed = serviceAssignmentSchema.safeParse({
    workerId: formData.get("workerId"),
    role: formData.get("role"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const organizationId = check.organization.organization.id;

  const [service] = await db.select().from(services).where(eq(services.id, serviceId));
  if (!service || service.organizationId !== organizationId) return { error: "Service introuvable." };

  const conflicts = await findWorkerConflicts({
    organizationId,
    workerId: v.workerId,
    startsAt: service.startsAt,
    endsAt: service.endsAt,
  });
  if (conflicts.length > 0) return { error: formatConflictMessage(conflicts) };

  const supabase = await createClient();
  const { error } = await supabase.from("service_assignments").insert({
    organization_id: organizationId,
    service_id: serviceId,
    worker_id: v.workerId,
    role: v.role,
    notes: orNull(v.notes),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Cet ouvrier est déjà affecté à ce rôle sur ce service." };
    }
    return { error: error.message };
  }

  revalidatePath("/services");
  return { success: true };
}

export async function updateServiceAssignmentStatus(assignmentId: string, status: string): Promise<ServiceActionState> {
  const check = await checkPermission("services.update");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette affectation." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_assignments")
    .update({ status })
    .eq("id", assignmentId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/services");
  return { success: true };
}

export async function removeServiceAssignment(assignmentId: string): Promise<ServiceActionState> {
  const check = await checkPermission("services.update");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut retirer une affectation." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("service_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/services");
  return { success: true };
}
