"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  certificationSchema,
  courseModuleSchema,
  courseCoverStoragePath,
  courseSchema,
  COURSE_COVER_BUCKET,
  COURSE_COVER_MAX_BYTES,
  COURSE_COVER_MIME_EXTENSIONS,
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
    category: formData.get("category"),
    description: formData.get("description"),
    instructorPersonId: formData.get("instructorPersonId"),
    prerequisites: formData.get("prerequisites"),
    level: formData.get("level"),
    status: formData.get("status"),
    publishedAt: formData.get("publishedAt"),
    allowEnrollment: formData.get("allowEnrollment"),
    showInLibrary: formData.get("showInLibrary"),
    moduleCount: formData.get("moduleCount"),
    moduleMinutes: formData.get("moduleMinutes"),
  });
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

function coverFile(formData: FormData) {
  const file = formData.get("cover");
  return file instanceof File && file.size > 0 ? file : undefined;
}

function validateCover(file: File | undefined) {
  if (!file) return null;
  if (!COURSE_COVER_MIME_EXTENSIONS[file.type]) return "Image de couverture : PNG, JPEG ou WebP uniquement.";
  if (file.size > COURSE_COVER_MAX_BYTES) return "Image de couverture trop volumineuse (2 Mo maximum).";
  return null;
}

async function uploadCover(supabase: Supabase, organizationId: string, courseId: string, file: File) {
  const path = `${organizationId}/${courseId}/cover-${crypto.randomUUID()}.${COURSE_COVER_MIME_EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage.from(COURSE_COVER_BUCKET).upload(path, file, { contentType: file.type });
  if (error) return { error: `Échec du téléversement de l'image : ${error.message}` };
  return { url: supabase.storage.from(COURSE_COVER_BUCKET).getPublicUrl(path).data.publicUrl, path };
}

async function removeCoverFile(supabase: Supabase, url: string | null | undefined) {
  const path = courseCoverStoragePath(url);
  if (!path) return;
  const { error } = await supabase.storage.from(COURSE_COVER_BUCKET).remove([path]);
  if (error) console.error("training: suppression de l'ancienne couverture impossible", error.message);
}

function courseColumns(v: ReturnType<typeof courseSchema.parse>, coInstructorIds: string[]) {
  return {
    title: v.title,
    category: v.category,
    description: v.description,
    status: v.status,
    instructor_person_id: v.instructorPersonId,
    co_instructor_ids: coInstructorIds.filter((id) => id !== v.instructorPersonId),
    prerequisites: orNull(v.prerequisites),
    level: v.level,
    published_at: orNull(v.publishedAt),
    allow_enrollment: v.allowEnrollment,
    show_in_library: v.showInLibrary,
  };
}

export async function createCourse(_prev: TrainingActionState, formData: FormData): Promise<TrainingActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un cours." };

  const parsed = parseCourseForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const moduleCount = Number(v.moduleCount);
  if (!Number.isInteger(moduleCount) || moduleCount < 1 || moduleCount > 100) {
    return { error: "Nombre de modules : entre 1 et 100." };
  }
  const moduleMinutes = orNumber(v.moduleMinutes);
  if (moduleMinutes !== null && (!Number.isInteger(moduleMinutes) || moduleMinutes < 0)) {
    return { error: "Durée par module invalide (minutes, nombre entier)." };
  }
  const cover = coverFile(formData);
  const coverError = validateCover(cover);
  if (coverError) return { error: coverError };

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .insert({
      organization_id: organizationId,
      ...courseColumns(v, formData.getAll("coInstructorIds").map(String)),
      duration_minutes: moduleMinutes !== null ? moduleMinutes * moduleCount : null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  // Un cours est inutilisable s'il échoue à mi-création : en cas d'erreur sur les modules ou la
  // couverture, on retire le cours (les modules partent en cascade) pour que l'utilisateur réessaie.
  const rollback = async (message: string, coverPath?: string) => {
    if (coverPath) await supabase.storage.from(COURSE_COVER_BUCKET).remove([coverPath]);
    await supabase.from("courses").delete().eq("id", course.id).eq("organization_id", organizationId);
    return { error: message };
  };

  const { error: modulesError } = await supabase.from("course_modules").insert(
    Array.from({ length: moduleCount }, (_, i) => ({
      organization_id: organizationId,
      course_id: course.id,
      title: `Module ${i + 1}`,
      sort_order: i + 1,
      duration_minutes: moduleMinutes,
    })),
  );
  if (modulesError) return rollback(modulesError.message);

  if (cover) {
    const uploaded = await uploadCover(supabase, organizationId, course.id, cover);
    if (uploaded.error !== undefined) return rollback(uploaded.error);
    const { error: coverSaveError } = await supabase.from("courses").update({ image_url: uploaded.url }).eq("id", course.id);
    if (coverSaveError) return rollback(coverSaveError.message, uploaded.path);
  }

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
  const cover = coverFile(formData);
  const coverError = validateCover(cover);
  if (coverError) return { error: coverError };
  const removeCover = formData.get("removeCover") === "on";

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("courses")
    .select("image_url")
    .eq("id", courseId)
    .eq("organization_id", organizationId)
    .single();
  if (!existing) return { error: "Cours introuvable." };

  let imageUrl: string | null | undefined; // undefined = inchangée
  let uploadedPath: string | undefined;
  if (cover) {
    const uploaded = await uploadCover(supabase, organizationId, courseId, cover);
    if (uploaded.error !== undefined) return { error: uploaded.error };
    imageUrl = uploaded.url;
    uploadedPath = uploaded.path;
  } else if (removeCover) {
    imageUrl = null;
  }

  const { error } = await supabase
    .from("courses")
    .update({
      ...courseColumns(v, formData.getAll("coInstructorIds").map(String)),
      ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
    })
    .eq("id", courseId)
    .eq("organization_id", organizationId);
  if (error) {
    if (uploadedPath) await supabase.storage.from(COURSE_COVER_BUCKET).remove([uploadedPath]);
    return { error: error.message };
  }
  if (imageUrl !== undefined) await removeCoverFile(supabase, existing.image_url);

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
  const { data: existing } = await supabase
    .from("courses")
    .select("image_url")
    .eq("id", courseId)
    .eq("organization_id", check.organization.organization.id)
    .single();
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };
  await removeCoverFile(supabase, existing?.image_url);

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
