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

export const announcementSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  content: z.string().min(1, "Contenu requis"),
  status: z.enum(["draft", "scheduled", "published", "archived"]).default("draft"),
  publishAt: optionalDateTime,
  expiresAt: optionalDateTime,
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
