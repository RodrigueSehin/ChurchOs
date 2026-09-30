import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

export const COURSE_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  enrolled: "Inscrit",
  completed: "Terminé",
  dropped: "Abandonné",
  pending: "En attente",
};

export const COURSE_CATEGORIES = [
  "Fondements de la foi",
  "Vie de prière",
  "Discipolat",
  "Étude biblique",
  "Leadership",
  "Croissance spirituelle",
  "Vie en communauté",
  "Autre",
];

export const COURSE_LEVELS: Record<string, string> = {
  all: "Tous niveaux",
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

export const COURSE_COVER_BUCKET = "churchos-course-covers";
export const COURSE_COVER_MAX_BYTES = 2 * 1024 * 1024;
export const COURSE_COVER_MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Chemin Storage d'une couverture de NOTRE bucket (sinon `null` : URL externe ou absente). */
export function courseCoverStoragePath(url: string | null | undefined) {
  const marker = `/object/public/${COURSE_COVER_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

const checkbox = z
  .string()
  .nullish()
  .transform((v) => v === "on" || v === "true");

export const courseSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(100, "Titre : 100 caractères maximum"),
  category: z.string().trim().min(1, "Catégorie requise"),
  description: z.string().trim().min(1, "Description requise").max(500, "Description : 500 caractères maximum"),
  instructorPersonId: z.string().min(1, "Formateur principal requis"),
  prerequisites: optionalString.pipe(z.string().max(300, "Prérequis : 300 caractères maximum")),
  level: z
    .string()
    .nullish()
    .transform((v) => v || "all")
    .pipe(z.enum(["all", "beginner", "intermediate", "advanced"])),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publishedAt: optionalString,
  allowEnrollment: checkbox,
  showInLibrary: checkbox,
  // Création uniquement : le formulaire génère « Module 1 » … « Module N » (absents à la modification).
  moduleCount: optionalString,
  moduleMinutes: optionalString,
});
export type CourseInput = z.infer<typeof courseSchema>;

export const courseModuleSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: optionalString,
  sortOrder: optionalString,
  durationMinutes: optionalString,
});
export type CourseModuleInput = z.infer<typeof courseModuleSchema>;

export const enrollPersonSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  // Le dialogue d'inscription ne rend jamais de champ statut (une nouvelle inscription démarre
  // toujours à "enrolled") : `formData.get("status")` vaut donc `null`, pas juste absent — même
  // motif que councilActionSchema/registrationSchema (Phases 6/8), corrigé ici dès l'écriture.
  status: z
    .enum(["enrolled", "completed", "dropped", "pending"])
    .nullish()
    .transform((v) => v ?? "enrolled"),
});
export type EnrollPersonInput = z.infer<typeof enrollPersonSchema>;

export const certificationSchema = z.object({
  personId: z.string().min(1, "Personne requise"),
  courseId: optionalString,
  name: z.string().min(1, "Nom du certificat requis"),
  certificateNumber: optionalString,
  issuedAt: optionalString,
  expiresAt: optionalString,
  credentialUrl: optionalString,
});
export type CertificationInput = z.infer<typeof certificationSchema>;
