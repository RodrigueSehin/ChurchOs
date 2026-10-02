"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { groups, messages, ministries, people } from "@/lib/db/schema";
import { dispatchMessage, resolveRecipients } from "@/features/communication/services/dispatch";
import { messageComposerSchema, type MessageAudience } from "@/features/communication/schemas/messages";

export interface MessageActionState {
  error?: string;
  success?: boolean;
  notice?: string;
  /** Identifiant du message enregistré (même si l'envoi a échoué : il reste alors en brouillon). */
  messageId?: string;
}

async function buildAudience(organizationId: string, ids: string[]): Promise<MessageAudience | null> {
  if (ids.length === 0 || ids.includes("all")) return { type: "all" };
  const targets: Extract<MessageAudience, { type: "targets" }>["targets"] = [];
  const personIds: string[] = [];
  for (const raw of ids) {
    const [kind, id] = raw.split(":");
    if (!id) return null;
    if (kind === "group") {
      const [row] = await db.select({ name: groups.name }).from(groups).where(and(eq(groups.id, id), eq(groups.organizationId, organizationId)));
      if (!row) return null;
      targets.push({ type: "group", id, name: row.name });
    } else if (kind === "ministry") {
      const [row] = await db.select({ name: ministries.name }).from(ministries).where(and(eq(ministries.id, id), eq(ministries.organizationId, organizationId)));
      if (!row) return null;
      targets.push({ type: "ministry", id, name: row.name });
    } else if (kind === "person") {
      personIds.push(id);
    } else {
      return null;
    }
  }
  // Mélange personnes / groupes non proposé par l'interface : les personnes priment.
  if (personIds.length > 0 && targets.length === 0) {
    const valid = await db.select({ id: people.id }).from(people).where(and(eq(people.organizationId, organizationId)));
    const allowed = new Set(valid.map((p) => p.id));
    const filtered = personIds.filter((p) => allowed.has(p));
    return filtered.length ? { type: "people", personIds: filtered } : null;
  }
  return targets.length ? { type: "targets", targets } : null;
}

/** Enregistre un message SMS / email : brouillon, envoi immédiat ou planifié (envoyé par la tâche planifiée). */
export async function saveMessage(input: { id?: string; fields: Record<string, unknown> }): Promise<MessageActionState> {
  const check = await checkPermission("messages.send");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'envoyer des messages." };
  const organizationId = check.organization.organization.id;

  const parsed = messageComposerSchema.safeParse(input.fields);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const audience = await buildAudience(organizationId, v.audience);
  if (!audience) return { error: "Destinataires introuvables." };

  let scheduledAt: Date | null = null;
  if (v.mode === "schedule") {
    scheduledAt = new Date(v.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60_000) {
      return { error: "La date de planification doit être dans le futur." };
    }
  }

  const values = {
    channel: v.channel,
    subject: v.title || null,
    body: v.body,
    recipientFilter: audience,
    scheduledAt,
    templateId: v.templateId || null,
  };

  let messageId = input.id;
  if (messageId) {
    const updated = await db
      .update(messages)
      .set(values)
      .where(and(eq(messages.id, messageId), eq(messages.organizationId, organizationId), isNull(messages.sentAt)))
      .returning({ id: messages.id });
    if (updated.length === 0) return { error: "Message introuvable ou déjà envoyé." };
  } else {
    const [row] = await db
      .insert(messages)
      .values({ ...values, organizationId, createdBy: check.user.id })
      .returning({ id: messages.id });
    if (!row) return { error: "Échec de l'enregistrement du message." };
    messageId = row.id;
  }

  if (v.mode === "send") {
    const result = await dispatchMessage(messageId, organizationId);
    revalidatePath("/communication/messages");
    revalidatePath("/communication");
    if (result.error) return { error: `${result.error} Le message est conservé en brouillon.`, messageId };
    return {
      success: true,
      messageId,
      notice: `${result.sent} message${result.sent > 1 ? "s" : ""} envoyé${result.sent > 1 ? "s" : ""}${result.failed ? `, ${result.failed} en échec` : ""}${result.skipped ? `, ${result.skipped} sans contact valide` : ""}.`,
    };
  }

  revalidatePath("/communication/messages");
  revalidatePath("/communication");
  return { success: true, notice: v.mode === "schedule" ? "Message planifié." : "Brouillon enregistré." };
}

/** Envoie tout de suite un brouillon ou un message planifié. */
export async function sendMessageNow(messageId: string): Promise<MessageActionState> {
  const check = await checkPermission("messages.send");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'envoyer des messages." };
  const result = await dispatchMessage(messageId, check.organization.organization.id);
  revalidatePath("/communication/messages");
  if (result.error) return { error: result.error };
  return { success: true, notice: `${result.sent} envoyé(s), ${result.failed} en échec.` };
}

/** Supprime un message (les messages déjà envoyés restent dans l'historique : suppression réservée aux brouillons / planifiés, ou à l'administrateur). */
export async function deleteMessage(messageId: string): Promise<MessageActionState> {
  const check = await checkPermission("messages.send");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de supprimer ce message." };
  const organizationId = check.organization.organization.id;
  const where = check.context.isAdmin
    ? and(eq(messages.id, messageId), eq(messages.organizationId, organizationId))
    : and(eq(messages.id, messageId), eq(messages.organizationId, organizationId), isNull(messages.sentAt));
  const deleted = await db.delete(messages).where(where).returning({ id: messages.id });
  if (deleted.length === 0) return { error: "Message introuvable, ou déjà envoyé (réservé à l'administrateur)." };
  revalidatePath("/communication/messages");
  revalidatePath("/communication");
  return { success: true };
}

/** Nombre de destinataires joignables pour une audience (aperçu « N destinataires sélectionnés »). */
export async function countRecipients(channel: "sms" | "email", ids: string[]): Promise<{ count: number; withoutContact: number; error?: string }> {
  const check = await checkPermission("messages.send");
  if (!check.allowed) return { count: 0, withoutContact: 0, error: "Permission refusée." };
  const organizationId = check.organization.organization.id;
  const audience = await buildAudience(organizationId, ids);
  if (!audience) return { count: 0, withoutContact: 0, error: "Destinataires introuvables." };
  const { recipients, withoutContact } = await resolveRecipients(organizationId, audience, channel);
  return { count: recipients.length, withoutContact };
}
