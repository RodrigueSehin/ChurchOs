import { z } from "zod";

import { SMS_MAX_LENGTH } from "@/features/communication/schemas/sms-constants";

export { SMS_MAX_LENGTH };
export const EMAIL_BODY_MAX_LENGTH = 5000;

export type MessageChannel = "sms" | "email";

/** Destinataires d'un message, stockés dans `messages.recipient_filter` (jsonb). */
export type MessageAudience =
  | { type: "all" }
  | { type: "targets"; targets: { type: "group" | "ministry"; id: string; name: string }[] }
  | { type: "people"; personIds: string[] };

/** Forme brute lue en base : `type` absent = ancien format du formulaire « Composer » (`{ personIds }`). */
export type StoredAudience = Partial<MessageAudience> & { personIds?: string[] };

/** Normalise `messages.recipient_filter` en audience typée. */
export function parseAudience(filter: unknown): MessageAudience {
  const a = (filter ?? {}) as StoredAudience;
  if (a.type === "targets" || a.type === "people" || a.type === "all") return a as MessageAudience;
  if (Array.isArray(a.personIds)) return { type: "people", personIds: a.personIds };
  return { type: "all" };
}

export const MESSAGE_STATUS_LABELS = { sent: "Envoyé", scheduled: "Planifié", draft: "Brouillon" } as const;
export type MessageStatus = keyof typeof MESSAGE_STATUS_LABELS;

export function messageAudienceLabel(filter: unknown): string {
  const a = filter as { type?: string; targets?: { name: string }[]; personIds?: string[] } | null;
  if (a?.type === "targets" && a.targets?.length) {
    return a.targets.length > 2 ? `${a.targets[0]!.name} +${a.targets.length - 1}` : a.targets.map((t) => t.name).join(", ");
  }
  if (a?.type === "people" && a.personIds) return `${a.personIds.length} personne${a.personIds.length > 1 ? "s" : ""}`;
  // Ancien format (formulaire « Composer ») : { personIds: [...] }.
  if (a && !a.type && Array.isArray(a.personIds)) return `${a.personIds.length} personne${a.personIds.length > 1 ? "s" : ""}`;
  return "Tous les membres";
}

export const messageComposerSchema = z
  .object({
    channel: z.enum(["sms", "email"]),
    title: z.string().trim().max(200, "Titre : 200 caractères maximum").default(""),
    body: z.string().trim().min(1, "Contenu requis"),
    /** `all`, `group:<uuid>`, `ministry:<uuid>` ou `person:<uuid>`. */
    audience: z.array(z.string()).default(["all"]),
    mode: z.enum(["draft", "send", "schedule"]),
    scheduledAt: z.string().default(""),
    templateId: z.string().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.channel === "email" && !v.title) ctx.addIssue({ code: "custom", path: ["title"], message: "Le sujet de l'email est requis." });
    if (v.channel === "sms" && v.body.length > SMS_MAX_LENGTH * 4) {
      ctx.addIssue({ code: "custom", path: ["body"], message: `SMS : ${SMS_MAX_LENGTH * 4} caractères maximum (${4} segments).` });
    }
    if (v.channel === "email" && v.body.length > EMAIL_BODY_MAX_LENGTH) {
      ctx.addIssue({ code: "custom", path: ["body"], message: `Email : ${EMAIL_BODY_MAX_LENGTH} caractères maximum.` });
    }
    if (v.mode === "schedule" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v.scheduledAt)) {
      ctx.addIssue({ code: "custom", path: ["scheduledAt"], message: "Choisissez la date et l'heure d'envoi." });
    }
  });
export type MessageComposerInput = z.infer<typeof messageComposerSchema>;
