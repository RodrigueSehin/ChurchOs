"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { groups, ministries, people } from "@/lib/db/schema";
import { EMAIL_FROM, getResendClient } from "@/lib/email/resend";
import {
  ANNOUNCEMENT_IMAGE_BUCKET,
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  ANNOUNCEMENT_IMAGE_MIME_EXTENSIONS,
  announcementImagePath,
  announcementSchema,
  messageSchema,
  templateSchema,
  type Audience,
} from "@/features/communication/schemas";

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
    audience: formData.get("audience"),
  });
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** `all` | `group:<uuid>` | `ministry:<uuid>` → filtre stocké (nom inclus : affichage sans jointure). */
async function resolveAudience(organizationId: string, raw: string): Promise<Audience | null> {
  if (raw === "all") return { type: "all" };
  const [kind, id] = raw.split(":");
  if (!id) return null;
  if (kind === "group") {
    const [row] = await db.select({ name: groups.name }).from(groups).where(and(eq(groups.id, id), eq(groups.organizationId, organizationId)));
    return row ? { type: "group", id, name: row.name } : null;
  }
  if (kind === "ministry") {
    const [row] = await db
      .select({ name: ministries.name })
      .from(ministries)
      .where(and(eq(ministries.id, id), eq(ministries.organizationId, organizationId)));
    return row ? { type: "ministry", id, name: row.name } : null;
  }
  return null;
}

function imageFile(formData: FormData) {
  const file = formData.get("image");
  return file instanceof File && file.size > 0 ? file : undefined;
}

function validateImage(file: File | undefined) {
  if (!file) return null;
  if (!ANNOUNCEMENT_IMAGE_MIME_EXTENSIONS[file.type]) return "Image : JPG, PNG ou WebP uniquement.";
  if (file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) return "Image trop volumineuse (4 Mo maximum).";
  return null;
}

async function uploadAnnouncementImage(supabase: Supabase, organizationId: string, file: File) {
  const path = `${organizationId}/${crypto.randomUUID()}.${ANNOUNCEMENT_IMAGE_MIME_EXTENSIONS[file.type]}`;
  const { error } = await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).upload(path, file, { contentType: file.type });
  if (error) return { error: `Échec du téléversement de l'image : ${error.message}` };
  return { path, url: supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl };
}

export async function createAnnouncement(_prev: CommunicationActionState, formData: FormData): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer une annonce." };

  const parsed = parseAnnouncementForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;
  const image = imageFile(formData);
  const imageError = validateImage(image);
  if (imageError) return { error: imageError };

  const organizationId = check.organization.organization.id;
  const audience = await resolveAudience(organizationId, v.audience);
  if (!audience) return { error: "Destinataires introuvables." };

  const supabase = await createClient();
  let uploaded: { path: string; url: string } | undefined;
  if (image) {
    const res = await uploadAnnouncementImage(supabase, organizationId, image);
    if ("error" in res && res.error) return { error: res.error };
    uploaded = res as { path: string; url: string };
  }

  const { error } = await supabase.from("announcements").insert({
    organization_id: organizationId,
    title: v.title,
    content: v.content,
    status: v.status,
    publish_at: orNull(v.publishAt),
    expires_at: orNull(v.expiresAt),
    audience_filter: audience,
    image_url: uploaded?.url ?? null,
    created_by: check.user.id,
  });
  if (error) {
    if (uploaded) await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).remove([uploaded.path]);
    return { error: error.message };
  }

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
  const image = imageFile(formData);
  const imageError = validateImage(image);
  if (imageError) return { error: imageError };
  const removeImage = formData.get("removeImage") === "on";

  const organizationId = check.organization.organization.id;
  const audience = await resolveAudience(organizationId, v.audience);
  if (!audience) return { error: "Destinataires introuvables." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("announcements")
    .select("image_url")
    .eq("id", announcementId)
    .eq("organization_id", organizationId)
    .single();
  if (!existing) return { error: "Annonce introuvable." };

  let imageUrl: string | null | undefined; // undefined = inchangée
  let uploaded: { path: string; url: string } | undefined;
  if (image) {
    const res = await uploadAnnouncementImage(supabase, organizationId, image);
    if ("error" in res && res.error) return { error: res.error };
    uploaded = res as { path: string; url: string };
    imageUrl = uploaded.url;
  } else if (removeImage) {
    imageUrl = null;
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      title: v.title,
      content: v.content,
      status: v.status,
      publish_at: orNull(v.publishAt),
      expires_at: orNull(v.expiresAt),
      audience_filter: audience,
      ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
    })
    .eq("id", announcementId)
    .eq("organization_id", organizationId);
  if (error) {
    if (uploaded) await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).remove([uploaded.path]);
    return { error: error.message };
  }
  const oldPath = imageUrl !== undefined ? announcementImagePath(existing.image_url) : null;
  if (oldPath) await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).remove([oldPath]);

  revalidatePath("/communication");
  return { success: true };
}

/** Enregistre qu'un utilisateur a ouvert une annonce (une seule fois par utilisateur et par annonce :
 * c'est ce qui alimente « Vues » et le taux de lecture). */
export async function markAnnouncementRead(announcementId: string): Promise<CommunicationActionState> {
  const check = await checkPermission("communication.view");
  if (!check.allowed) return { error: "Action non autorisée." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcement_reads")
    .upsert(
      { announcement_id: announcementId, user_id: check.user.id, organization_id: check.organization.organization.id },
      { onConflict: "announcement_id,user_id", ignoreDuplicates: true },
    );
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
  const { data: existing } = await supabase
    .from("announcements")
    .select("image_url")
    .eq("id", announcementId)
    .eq("organization_id", check.organization.organization.id)
    .single();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };
  const imagePath = announcementImagePath(existing?.image_url);
  if (imagePath) await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).remove([imagePath]);

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
