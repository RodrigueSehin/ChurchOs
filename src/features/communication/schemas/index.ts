import { z } from "zod";

const optionalString = z.string().nullish().transform((v) => v ?? "");
const optionalDateTime = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/), z.literal("")])
  .nullish()
  .transform((v) => v ?? "");

export const ANNOUNCEMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  scheduled: "Planifiée",
  published: "Publiée",
  archived: "Archivée",
};

export const TEMPLATE_CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  queued: "En file",
  sent: "Envoyé",
  delivered: "Livré",
  failed: "Échoué",
  read: "Lu",
};

export const ANNOUNCEMENT_IMAGE_BUCKET = "churchos-announcements";
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const ANNOUNCEMENT_IMAGE_MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Chemin Storage d'une image d'annonce de NOTRE bucket (sinon `null`). */
export function announcementImagePath(url: string | null | undefined) {
  const marker = `/object/public/${ANNOUNCEMENT_IMAGE_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}

export const ANNOUNCEMENT_TYPE_LABELS: Record<string, string> = {
  announcement: "Annonce",
  event: "Événement",
  reminder: "Rappel",
  urgent: "Urgent",
};

export const ANNOUNCEMENT_CATEGORIES = [
  "Vie chrétienne",
  "Événements",
  "Jeunesse",
  "Prière",
  "Formation",
  "Finances",
  "Administration",
  "Autres",
];

export const ANNOUNCEMENT_IMPORTANCE_LABELS: Record<string, string> = {
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

export const ATTACHMENT_MAX_BYTES = 50 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_MIME: Record<"video" | "document", string[]> = {
  video: ["video/mp4"],
  document: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

export const CONTENT_MAX_LENGTH = 2000;

export const SOCIAL_PROVIDER_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

/** Destinataires d'une annonce, stockés dans `announcements.audience_filter` (jsonb) : toute l'église, ou
 * une liste de groupes / ministères. (L'ancien format à cible unique reste lisible.) */
export type AudienceTarget = { type: "group" | "ministry"; id: string; name: string };
export type Audience = { type: "all" } | { type: "targets"; targets: AudienceTarget[] };

export function audienceLabel(filter: unknown): string {
  const a = filter as { type?: string; targets?: AudienceTarget[]; name?: string } | null;
  if (a?.type === "targets" && a.targets?.length) {
    return a.targets.length > 2 ? `${a.targets[0]!.name} +${a.targets.length - 1}` : a.targets.map((t) => t.name).join(", ");
  }
  if ((a?.type === "group" || a?.type === "ministry") && a.name) return a.name;
  return "Tous les membres";
}

export const announcementSchema = z.object({
  title: z.string().trim().min(1, "Titre requis").max(200, "Titre : 200 caractères maximum"),
  content: z.string().trim().min(1, "Contenu requis").max(CONTENT_MAX_LENGTH, `Contenu : ${CONTENT_MAX_LENGTH} caractères maximum`),
  announcementType: z.enum(["announcement", "event", "reminder", "urgent"], { message: "Type requis" }),
  category: z.string().trim().min(1, "Catégorie requise"),
  importance: z
    .enum(["normal", "high", "urgent"])
    .nullish()
    .transform((v) => v ?? "normal"),
  /** `all` ou une liste d'identifiants `group:<uuid>` / `ministry:<uuid>`. */
  audience: z.array(z.string()).transform((v) => (v.length === 0 ? ["all"] : v)),
  /** brouillon, ou publication (immédiate ou programmée selon `publishAt`). */
  mode: z.enum(["draft", "publish"]),
  publishAt: optionalDateTime,
  /** Comptes de réseaux sociaux ciblés (identifiants de `social_connections`). */
  socialConnectionIds: z.array(z.string()).default([]),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const templateSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  channel: z.enum(["email", "sms", "whatsapp"]).default("email"),
  subject: optionalString,
  body: z.string().min(1, "Contenu requis"),
  variables: optionalString,
});
export type TemplateInput = z.infer<typeof templateSchema>;

export const messageSchema = z.object({
  templateId: optionalString,
  subject: z.string().min(1, "Sujet requis"),
  body: z.string().min(1, "Contenu requis"),
});
export type MessageInput = z.infer<typeof messageSchema>;

/** Texte « brut » d'une annonce rédigée avec la mise en forme légère (**gras**, _italique_, listes `- `,
 * liens `[texte](url)`) — pour les publications sociales, qui n'interprètent pas ce balisage. */
export function markdownToPlain(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\+\+([^+]+)\+\+/g, "$1")
    .replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:!?])/g, "$1$2")
    .replace(/^[-*] /gm, "• ");
}
