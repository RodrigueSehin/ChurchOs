"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { people } from "@/lib/db/schema";
import { EMAIL_FROM, getResendClient } from "@/lib/email/resend";
import { announcementSchema, messageSchema, templateSchema } from "@/features/communication/schemas";

export interface CommunicationActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function parseAnnouncementForm(formData: FormData) {
  return announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    status: formData.get("status"),
    publishAt: formData.get("publishAt"),
    expiresAt: formData.get("expiresAt"),
  });
}

export async function createAnnouncement(_prev: CommunicationActionState, formData: FormData): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une annonce." };

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    organization_id: check.organization.organization.id,
    title: v.title,
    content: v.content,
    status: v.status,
    publish_at: orNull(v.publishAt),
    expires_at: orNull(v.expiresAt),
    created_by: check.user.id,
  });
  if (error) return { error: error.message };

  revalidatePath("/communication");
  return { success: true };
}

export async function updateAnnouncement(
  announcementId: string,
  _prev: CommunicationActionState,
  formData: FormData,
): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier cette annonce." };

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({
      title: v.title,
      content: v.content,
      status: v.status,
      publish_at: orNull(v.publishAt),
      expires_at: orNull(v.expiresAt),
    })
    .eq("id", announcementId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/communication");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`) — même contrainte que les
 * autres modules (voir `features/ministries/actions`). */
export async function deleteAnnouncement(announcementId: string): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer une annonce." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/communication");
  return { success: true };
}

export async function createTemplate(_prev: CommunicationActionState, formData: FormData): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un modèle." };

  const parsed = templateSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    variables: formData.get("variables"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").insert({
    organization_id: check.organization.organization.id,
    name: v.name,
    channel: v.channel,
    subject: orNull(v.subject),
    body: v.body,
    variables: v.variables
      ? v.variables.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un modèle avec ce nom existe déjà pour ce canal." };
    }
    return { error: error.message };
  }

  revalidatePath("/communication");
  return { success: true };
}

/** Réservé aux admins — même contrainte que la suppression d'une annonce. */
export async function deleteTemplate(templateId: string): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un modèle." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", templateId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/communication");
  return { success: true };
}

/**
 * Envoi réel par email via Resend (seul canal opérationnel cette phase — voir
 * docs/architecture/07-sprint-plan.md, Phase 11). Crée la campagne (`messages`), une ligne
 * `notifications` par destinataire (statut `queued` puis `sent`/`failed` selon la réponse
 * synchrone de Resend), et associe chaque notification à sa campagne via `data.messageId` (voir
 * le commentaire de `getMessages` dans `features/communication/queries` — pas de colonne
 * `message_id` sur `notifications` dans le schéma réel).
 */
export async function sendMessage(_prev: CommunicationActionState, formData: FormData): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.send");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'envoyer un message." };

  const parsed = messageSchema.safeParse({
    templateId: formData.get("templateId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const personIds = formData.getAll("personIds").map(String).filter(Boolean);
  if (personIds.length === 0) return { error: "Sélectionnez au moins un destinataire." };

  const organizationId = check.organization.organization.id;
  const recipients = await db
    .select({ id: people.id, firstName: people.firstName, lastName: people.lastName, email: people.email })
    .from(people)
    .where(inArray(people.id, personIds));
  const validRecipients = recipients.filter((r) => r.email);
  if (validRecipients.length === 0) return { error: "Aucun destinataire sélectionné n'a d'adresse email." };

  const supabase = await createClient();
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      organization_id: organizationId,
      template_id: orNull(v.templateId),
      channel: "email",
      subject: v.subject,
      body: v.body,
      recipient_filter: { personIds },
      created_by: check.user.id,
    })
    .select("id")
    .single();
  if (messageError || !message) return { error: messageError?.message ?? "Échec de la création du message." };

  const resend = getResendClient();

  for (const recipient of validRecipients) {
    const { data: notification, error: notificationError } = await supabase
      .from("notifications")
      .insert({
        organization_id: organizationId,
        person_id: recipient.id,
        channel: "email",
        title: v.subject,
        body: v.body,
        status: "queued",
        data: { messageId: message.id },
      })
      .select("id")
      .single();
    if (notificationError || !notification) continue;

    try {
      const { data: sent, error: sendError } = await resend.emails.send({
        from: EMAIL_FROM,
        to: recipient.email!,
        subject: v.subject,
        html: v.body,
      });
      if (sendError || !sent) {
        await supabase
          .from("notifications")
          .update({ status: "failed", data: { messageId: message.id, error: sendError?.message ?? "Échec inconnu" } })
          .eq("id", notification.id);
      } else {
        await supabase
          .from("notifications")
          .update({ status: "sent", sent_at: new Date().toISOString(), data: { messageId: message.id, resendId: sent.id } })
          .eq("id", notification.id);
      }
    } catch (err) {
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          data: { messageId: message.id, error: err instanceof Error ? err.message : "Échec inconnu" },
        })
        .eq("id", notification.id);
    }
  }

  await supabase.from("messages").update({ sent_at: new Date().toISOString() }).eq("id", message.id);

  revalidatePath("/communication");
  return { success: true };
}

/**
 * Le statut synchrone de `resend.emails.send()` ne confirme que l'acceptation par Resend
 * (`sent`), pas la livraison réelle (`delivered`/`bounced`) — celle-ci n'arrive qu'en asynchrone.
 * Sans URL publique joignable par un webhook Resend en développement local, on interroge
 * directement `resend.emails.get(id)` (qui reflète le suivi interne de Resend, indépendant de
 * tout webhook configuré côté client) pour rafraîchir le statut réel après l'envoi.
 */
export async function refreshMessageStatuses(messageId: string): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.send");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de rafraîchir ce statut." };

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("notifications")
    .select("id, data")
    .eq("organization_id", check.organization.organization.id)
    .eq("status", "sent");
  if (error) return { error: error.message };

  const resend = getResendClient();
  for (const row of rows ?? []) {
    const data = row.data as { messageId?: string; resendId?: string } | null;
    if (!data || data.messageId !== messageId || !data.resendId) continue;

    const { data: email, error: getError } = await resend.emails.get(data.resendId);
    if (getError) return { error: `Resend a refusé la lecture du statut : ${getError.message}` };
    if (!email) continue;

    let nextStatus: string | null = null;
    if (email.last_event === "delivered" || email.last_event === "opened" || email.last_event === "clicked") {
      nextStatus = "delivered";
    } else if (
      email.last_event === "bounced" ||
      email.last_event === "failed" ||
      email.last_event === "complained" ||
      email.last_event === "suppressed"
    ) {
      nextStatus = "failed";
    }
    if (nextStatus) {
      await supabase
        .from("notifications")
        .update({ status: nextStatus, data: { ...data, lastEvent: email.last_event } })
        .eq("id", row.id);
    }
  }

  revalidatePath("/communication");
  return { success: true };
}
