"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  certificationSchema,
  courseModuleSchema,
  courseSchema,
  enrollPersonSchema,
} from "@/features/training/schemas";

export interface TrainingActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function orNumber(value: string) {
  return value.trim() === "" ? null : Number(value);
}

function parseCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    status: formData.get("status"),
    instructorPersonId: formData.get("instructorPersonId"),
    imageUrl: formData.get("imageUrl"),
    durationMinutes: formData.get("durationMinutes"),
  });
}

export async function createCourse(_prev: TrainingActionState, formData: FormData): Promise<TrainingActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un cours." };

  const parsed = parseCourseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({
    organization_id: check.organization.organization.id,
    title: v.title,
    description: orNull(v.description),
    status: v.status,
    instructor_person_id: orNull(v.instructorPersonId),
    image_url: orNull(v.imageUrl),
    duration_minutes: orNumber(v.durationMinutes),
  });
  if (error) return { error: error.message };

  revalidatePath("/training");
  return { success: true };
}

export async function updateCourse(
  courseId: string,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce cours." };

  const parsed = parseCourseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .update({
      title: v.title,
      description: orNull(v.description),
      status: v.status,
      instructor_person_id: orNull(v.instructorPersonId),
      image_url: orNull(v.imageUrl),
      duration_minutes: orNumber(v.durationMinutes),
    })
    .eq("id", courseId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/training");
  revalidatePath(`/training/${courseId}`);
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`) — même contrainte que
 * `features/ministries/actions`. */
export async function deleteCourse(courseId: string): Promise<TrainingActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un cours." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/training");
  return { success: true };
}

export async function addCourseModule(
  courseId: string,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce cours." };

  const parsed = courseModuleSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    sortOrder: formData.get("sortOrder"),
    durationMinutes: formData.get("durationMinutes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("course_modules").insert({
    organization_id: check.organization.organization.id,
    course_id: courseId,
    title: v.title,
    description: orNull(v.description),
    sort_order: orNumber(v.sortOrder) ?? 0,
    duration_minutes: orNumber(v.durationMinutes),
  });
  if (error) return { error: error.message };

  revalidatePath(`/training/${courseId}`);
  return { success: true };
}

/** Réservé aux admins — même contrainte que la suppression d'un cours. */
export async function deleteCourseModule(courseId: string, moduleId: string): Promise<TrainingActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un module." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_modules")
    .delete()
    .eq("id", moduleId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(`/training/${courseId}`);
  return { success: true };
}

export async function enrollPerson(
  courseId: string,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const check = await checkPermission("training.enroll");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'inscrire une personne à ce cours." };

  const parsed = enrollPersonSchema.safeParse({
    personId: formData.get("personId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("course_enrollments").insert({
    organization_id: check.organization.organization.id,
    course_id: courseId,
    person_id: v.personId,
    status: v.status,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Cette personne est déjà inscrite à ce cours." };
    }
    return { error: error.message };
  }

  revalidatePath(`/training/${courseId}`);
  return { success: true };
}

export async function updateEnrollmentStatus(
  courseId: string,
  enrollmentId: string,
  status: string,
): Promise<TrainingActionState> {
  const check = await checkPermission("training.enroll");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette inscription." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  patch.completed_at = status === "completed" ? new Date().toISOString() : null;
  if (status === "completed") patch.progress = 100;

  const { error } = await supabase
    .from("course_enrollments")
    .update(patch)
    .eq("id", enrollmentId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(`/training/${courseId}`);
  return { success: true };
}

export async function updateEnrollmentProgress(
  courseId: string,
  enrollmentId: string,
  progress: string,
): Promise<TrainingActionState> {
  const check = await checkPermission("training.enroll");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette inscription." };

  const value = Number(progress);
  if (Number.isNaN(value) || value < 0 || value > 100) {
    return { error: "La progression doit être comprise entre 0 et 100." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_enrollments")
    .update({ progress: value })
    .eq("id", enrollmentId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(`/training/${courseId}`);
  return { success: true };
}

/** Réservé aux admins — même contrainte que la suppression d'un cours. */
export async function removeEnrollment(courseId: string, enrollmentId: string): Promise<TrainingActionState> {
  const check = await checkPermission("training.enroll");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut désinscrire une personne." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_enrollments")
    .delete()
    .eq("id", enrollmentId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath(`/training/${courseId}`);
  return { success: true };
}

export async function issueCertification(
  courseId: string | null,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const check = await checkPermission("training.certify");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de délivrer une certification." };

  const parsed = certificationSchema.safeParse({
    personId: formData.get("personId"),
    courseId: formData.get("courseId") || (courseId ?? ""),
    name: formData.get("name"),
    certificateNumber: formData.get("certificateNumber"),
    issuedAt: formData.get("issuedAt"),
    expiresAt: formData.get("expiresAt"),
    credentialUrl: formData.get("credentialUrl"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("certifications").insert({
    organization_id: check.organization.organization.id,
    course_id: orNull(v.courseId),
    person_id: v.personId,
    name: v.name,
    certificate_number: orNull(v.certificateNumber),
    issued_at: orNull(v.issuedAt),
    expires_at: orNull(v.expiresAt),
    credential_url: orNull(v.credentialUrl),
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un certificat avec ce numéro existe déjà." };
    }
    return { error: error.message };
  }

  if (courseId) revalidatePath(`/training/${courseId}`);
  revalidatePath("/training");
  return { success: true };
}

/** Réservé aux admins — même contrainte que la suppression d'un cours. */
export async function deleteCertification(courseId: string | null, certificationId: string): Promise<TrainingActionState> {
  const check = await checkPermission("training.certify");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une certification." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("certifications")
    .delete()
    .eq("id", certificationId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  if (courseId) revalidatePath(`/training/${courseId}`);
  revalidatePath("/training");
  return { success: true };
}
