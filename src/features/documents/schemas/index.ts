import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

/**
 * `document_visibility` (schéma réel) a aussi `campus`/`public`, mais ni `documents` ni
 * `document_folders` n'ont de colonne `campus_id` pour donner un sens réel à `campus`, et il
 * n'existe aucune route publique non authentifiée pour donner un sens réel à `public` — les
 * exposer dans ce formulaire créerait une option qui ne fait rien de plus que "organization".
 * Seules les deux valeurs qui correspondent à une vraie distinction de permission dans cette
 * application sont proposées ici ; les deux autres restent des valeurs valides en base, juste
 * non atteignables depuis cette UI.
 */
export const DOCUMENT_VISIBILITY_LABELS: Record<string, string> = {
  private: "Privé (moi uniquement)",
  organization: "Toute l'organisation",
};

/** Miroir exact de `allowed_mime_types` sur le bucket Supabase Storage `churchos-documents`
 * (voir db/schema.sql §23) — validation applicative en plus du contrôle réel côté Storage, pas à
 * sa place : un utilisateur doit voir une erreur claire immédiatement, pas après l'upload. */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const folderSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  parentId: optionalString,
  visibility: z.enum(["private", "organization"]).default("organization"),
});
export type FolderInput = z.infer<typeof folderSchema>;

export const documentUploadSchema = z.object({
  name: optionalString,
  folderId: optionalString,
  visibility: z.enum(["private", "organization"]).default("organization"),
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
