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

export const courseSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: optionalString,
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  instructorPersonId: optionalString,
  imageUrl: optionalString,
  durationMinutes: optionalString,
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
