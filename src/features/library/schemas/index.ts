import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");

/** La bibliothèque n'accepte que des PDF et des DOCX : les types « vidéo » et « audio » (restes d'une
 * première version) ne sont plus proposés, mais les éventuelles ressources existantes restent lisibles. */
export const RESOURCE_TYPE_TABS: Record<string, string> = {
  book: "Livres",
  bible_study: "Études bibliques",
  teaching: "Enseignements",
  document: "Documents",
};

export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  book: "Livre",
  bible_study: "Étude biblique",
  teaching: "Enseignement",
  document: "Document",
};

export const RESOURCE_VISIBILITY_LABELS: Record<string, string> = {
  members: "Visible par tous les membres",
  managers: "Visible par les responsables",
};

export const RESOURCE_STATUS_LABELS: Record<string, string> = {
  published: "Publié",
  draft: "Brouillon",
  archived: "Archivé",
};

/** Formats (déduits du type MIME du fichier) proposés dans le filtre « Tous les types ». */
export const RESOURCE_FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  word: "Word (DOCX)",
};

export const LIBRARY_BUCKET = "churchos-library";
export const LIBRARY_COVER_BUCKET = "churchos-library-covers";
export const RESOURCE_MAX_BYTES = 100 * 1024 * 1024;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const RESOURCE_MIME_TYPES = [PDF_MIME, DOCX_MIME];

/** Type MIME d'un fichier choisi : certains navigateurs/systèmes laissent `file.type` vide pour un .docx. */
export function resolveResourceMime(file: { name: string; type: string }) {
  if (RESOURCE_MIME_TYPES.includes(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return PDF_MIME;
  if (name.endsWith(".docx")) return DOCX_MIME;
  return file.type;
}
export const COVER_MIME_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export const DEFAULT_LIBRARY_CATEGORIES = [
  "Vie chrétienne",
  "Études bibliques",
  "Leadership",
  "Ministère pastoral",
  "Famille",
  "Jeunesse",
  "Évangélisation",
  "Dévotion",
  "Formation",
  "Administration",
  "Témoignages",
  "Autres",
];

export function formatKind(mime: string | null | undefined) {
  if (!mime) return "Fichier";
  if (mime === "application/pdf") return "PDF";
  if (mime === DOCX_MIME) return "DOCX";
  if (mime.startsWith("video/")) return "Vidéo";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime.startsWith("image/")) return "Image";
  if (mime.includes("word")) return "Word";
  if (mime.includes("powerpoint") || mime.includes("presentation")) return "PowerPoint";
  return "Fichier";
}

export function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200, "Titre : 200 caractères maximum"),
  resourceType: z.enum(["book", "bible_study", "teaching", "document"], { message: "Type requis" }),
  categoryId: z.string().min(1, "Catégorie requise"),
  author: optionalString,
  publishedOn: optionalString,
  publisher: optionalString,
  description: z.string().trim().min(1, "Description requise").max(500, "Description : 500 caractères maximum"),
  visibility: z
    .enum(["members", "managers"])
    .nullish()
    .transform((v) => v ?? "members"),
  status: z
    .enum(["published", "draft", "archived"])
    .nullish()
    .transform((v) => v ?? "published"),
  tags: optionalString,
});

export const libraryCategorySchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(60, "60 caractères maximum"),
});
