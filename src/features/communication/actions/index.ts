"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { announcementSocialPosts, groups, ministries, people, socialConnections } from "@/lib/db/schema";
import { decryptToken } from "@/lib/social/crypto";
import { publishToFacebook, publishToInstagram } from "@/lib/social/graph";
import { EMAIL_FROM, getResendClient } from "@/lib/email/resend";
import {
  ANNOUNCEMENT_IMAGE_BUCKET,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME,
  IMAGE_MAX_BYTES,
  announcementImagePath,
  announcementSchema,
  markdownToPlain,
  messageSchema,
  templateSchema,
  type Audience,
  type AudienceTarget,
} from "@/features/communication/schemas";

export interface CommunicationActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

/** `group:<uuid>` / `ministry:<uuid>` → cible nommée (le nom est stocké : affichage sans jointure). */
async function resolveAudience(organizationId: string, ids: string[]): Promise<Audience | null> {
  if (ids.includes("all")) return { type: "all" };
  const targets: AudienceTarget[] = [];
  for (const raw of ids) {
    const [kind, id] = raw.split(":");
    if (!id) return null;
    if (kind === "group") {
      const [row] = await db.select({ name: groups.name }).from(groups).where(and(eq(groups.id, id), eq(groups.organizationId, organizationId)));
      if (!row) return null;
      targets.push({ type: "group", id, name: row.name });
    } else if (kind === "ministry") {
      const [row] = await db
        .select({ name: ministries.name })
        .from(ministries)
        .where(and(eq(ministries.id, id), eq(ministries.organizationId, organizationId)));
      if (!row) return null;
      targets.push({ type: "ministry", id, name: row.name });
    } else {
      return null;
    }
  }
  return { type: "targets", targets };
}

export interface MediaRef {
  path: string;
  mime: string;
  size: number;
}

export interface SocialResult {
  provider: string;
  label: string;
  status: "published" | "scheduled" | "failed";
  error?: string;
}

export interface SaveAnnouncementState extends CommunicationActionState {
  announcementId?: string;
  social?: SocialResult[];
}

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

function publicUrl(supabase: Awaited<ReturnType<typeof createClient>>, path: string) {
  return supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Crée ou modifie une annonce (formulaire « Nouvelle annonce »). Les médias (image 5 Mo, vidéo/document
 * 50 Mo) ont déjà été envoyés DIRECTEMENT du navigateur vers Storage — une Server Action ne peut pas les
 * porter ; leurs chemins sont revérifiés ici (préfixe de l'organisation, type, taille) et les fichiers
 * orphelins sont retirés en cas d'échec. Les publications sociales sont tentées APRÈS l'enregistrement :
 * un échec chez Meta est consigné par compte (et renvoyé) sans annuler l'annonce.
 */
export async function saveAnnouncement(input: {
  id?: string;
  fields: Record<string, unknown>;
  image?: MediaRef | null;
  removeImage?: boolean;
  attachment?: (MediaRef & { name: string; type: "video" | "document" }) | null;
  removeAttachment?: boolean;
}): Promise<SaveAnnouncementState> {
  const check = await checkPermission("communication.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les annonces." };

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const discardNew = async () => {
    const paths = [input.image?.path, input.attachment?.path].filter((p): p is string => Boolean(p));
    if (paths.length) await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).remove(paths);
  };
  const fail = async (error: string): Promise<SaveAnnouncementState> => {
    await discardNew();
    return { error };
  };

  const parsed = announcementSchema.safeParse(input.fields);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  const v = parsed.data;

  for (const media of [input.image, input.attachment]) {
    if (media && (!media.path.startsWith(`${organizationId}/`) || media.path.includes(".."))) return fail("Chemin de fichier invalide.");
  }
  if (input.image && (!IMAGE_MIME.includes(input.image.mime) || input.image.size <= 0 || input.image.size > IMAGE_MAX_BYTES)) {
    return fail("Image : JPG, PNG ou WebP, 5 Mo maximum.");
  }
  if (input.attachment) {
    const a = input.attachment;
    if (!ATTACHMENT_MIME[a.type]?.includes(a.mime) || a.size <= 0 || a.size > ATTACHMENT_MAX_BYTES) {
      return fail("Fichier joint : vidéo MP4 ou document PDF/DOCX, 50 Mo maximum.");
    }
  }

  const audience = await resolveAudience(organizationId, v.audience);
  if (!audience) return fail("Destinataires introuvables.");

  // Statut : brouillon, publication immédiate, ou programmation (date future).
  const now = Date.now();
  const requestedAt = v.publishAt ? new Date(v.publishAt) : null;
  if (requestedAt && Number.isNaN(requestedAt.getTime())) return fail("Date de publication invalide.");
  const scheduled = v.mode === "publish" && requestedAt !== null && requestedAt.getTime() > now + 60_000;
  const status = v.mode === "draft" ? "draft" : scheduled ? "scheduled" : "published";
  const publishAt = v.mode === "draft" ? requestedAt : scheduled ? requestedAt : new Date(now);

  // Comptes sociaux ciblés : appartiennent à l'organisation ; règles propres à chaque réseau.
  let connections: (typeof socialConnections.$inferSelect)[] = [];
  if (v.socialConnectionIds.length > 0) {
    if (v.mode !== "publish") return fail("Les réseaux sociaux ne sont utilisables qu'à la publication (pas en brouillon).");
    connections = await db
      .select()
      .from(socialConnections)
      .where(and(eq(socialConnections.organizationId, organizationId), inArray(socialConnections.id, v.socialConnectionIds)));
    if (connections.length !== new Set(v.socialConnectionIds).size) return fail("Compte de réseau social introuvable.");
    const hasImage = Boolean(input.image) || (input.id ? !input.removeImage : false);
    if (connections.some((c) => c.provider === "instagram")) {
      if (scheduled) return fail("Instagram ne permet pas la programmation par l'API : publiez maintenant ou décochez Instagram.");
      if (!hasImage) return fail("Instagram exige une image : ajoutez-en une ou décochez Instagram.");
    }
    if (scheduled && requestedAt) {
      const delta = requestedAt.getTime() - now;
      if (delta < 10 * 60_000 || delta > 30 * 24 * 3600_000) {
        return fail("Facebook ne programme que de 10 minutes à 30 jours à l'avance.");
      }
    }
  }

  let existing: { image_url: string | null; attachment_url: string | null } | null = null;
  if (input.id) {
    const { data } = await supabase
      .from("announcements")
      .select("image_url, attachment_url")
      .eq("id", input.id)
      .eq("organization_id", organizationId)
      .single();
    if (!data) return fail("Annonce introuvable.");
    existing = data;
  }

  const imageUrl = input.image ? publicUrl(supabase, input.image.path) : input.removeImage ? null : undefined;
  const attachmentChange = input.attachment
    ? { attachment_url: publicUrl(supabase, input.attachment.path), attachment_name: input.attachment.name, attachment_type: input.attachment.type }
    : input.removeAttachment
      ? { attachment_url: null, attachment_name: null, attachment_type: null }
      : {};

  const row = {
    title: v.title,
    content: v.content,
    status,
    publish_at: publishAt ? publishAt.toISOString() : null,
    announcement_type: v.announcementType,
    category: v.category,
    importance: v.importance,
    audience_filter: audience,
    ...(imageUrl !== undefined ? { image_url: imageUrl } : {}),
    ...attachmentChange,
  };

  let announcementId = input.id;
  if (input.id) {
    const { error } = await supabase.from("announcements").update(row).eq("id", input.id).eq("organization_id", organizationId);
    if (error) return fail(error.message);
  } else {
    const { data, error } = await supabase
      .from("announcements")
      .insert({ ...row, organization_id: organizationId, created_by: check.user.id })
      .select("id")
      .single();
    if (error) return fail(error.message);
    announcementId = data.id;
  }

  // Anciens médias supprimés une fois la ligne à jour.
  if (existing) {
    const stale: string[] = [];
    if (imageUrl !== undefined) stale.push(announcementImagePath(existing.image_url) ?? "");
    if (input.attachment || input.removeAttachment) stale.push(announcementImagePath(existing.attachment_url) ?? "");
    const paths = stale.filter(Boolean);
    if (paths.length) await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).remove(paths);
  }

  // ---- Réseaux sociaux (après l'enregistrement : un échec ne l'annule pas) ----
  const social: SocialResult[] = [];
  if (connections.length > 0 && announcementId) {
    const finalImage =
      imageUrl !== undefined ? imageUrl : existing?.image_url ?? null;
    const message = `${v.title}\n\n${markdownToPlain(v.content)}`;
    const alreadyPosted = await db
      .select({ connectionId: announcementSocialPosts.connectionId })
      .from(announcementSocialPosts)
      .where(and(eq(announcementSocialPosts.announcementId, announcementId), inArray(announcementSocialPosts.status, ["published", "scheduled"])));
    const posted = new Set(alreadyPosted.map((p) => p.connectionId));

    for (const c of connections) {
      if (posted.has(c.id)) continue;
      const result: SocialResult = { provider: c.provider, label: c.label, status: "failed" };
      let externalId: string | null = null;
      try {
        const token = decryptToken(c.tokenEncrypted);
        if (c.provider === "facebook") {
          const res = await publishToFacebook({
            pageId: c.externalId,
            token,
            message,
            imageUrl: finalImage,
            scheduledAt: scheduled ? requestedAt : null,
          });
          externalId = res.id;
          result.status = res.scheduled ? "scheduled" : "published";
        } else {
          const res = await publishToInstagram({ igUserId: c.externalId, token, caption: message, imageUrl: finalImage! });
          externalId = res.id;
          result.status = "published";
        }
      } catch (err) {
        result.error = err instanceof Error ? err.message : "Échec de la publication.";
      }
      social.push(result);
      await db.insert(announcementSocialPosts).values({
        organizationId,
        announcementId,
        connectionId: c.id,
        provider: c.provider,
        status: result.status,
        externalPostId: externalId,
        error: result.error ?? null,
      });
    }
  }

  revalidatePath("/communication");
  return { success: true, announcementId, social };
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
    .select("image_url, attachment_url")
    .eq("id", announcementId)
    .eq("organization_id", check.organization.organization.id)
    .single();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };
  const stale = [announcementImagePath(existing?.image_url), announcementImagePath(existing?.attachment_url)].filter((p): p is string => Boolean(p));
  if (stale.length) await supabase.storage.from(ANNOUNCEMENT_IMAGE_BUCKET).remove(stale);

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
  const check = await checkPermission("messages.send");
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
  const check = await checkPermission("messages.send");
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
