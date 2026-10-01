import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { groupMembers, members, messages, ministryMembers, notifications, people } from "@/lib/db/schema";
import { EMAIL_FROM, getResendClient } from "@/lib/email/resend";
import { isSmsConfigured, normalizePhone, sendSms } from "@/lib/sms/twilio";
import { parseAudience, type MessageAudience } from "@/features/communication/schemas/messages";

export interface ResolvedRecipient {
  personId: string;
  firstName: string;
  lastName: string;
  /** Numéro E.164 (SMS) ou adresse email, selon le canal. */
  address: string;
}

/** Personnes visées par une audience, dédupliquées, ne gardant que celles joignables par ce canal. */
export async function resolveRecipients(
  organizationId: string,
  audience: MessageAudience,
  channel: "sms" | "email",
): Promise<{ recipients: ResolvedRecipient[]; withoutContact: number }> {
  const base = { id: people.id, firstName: people.firstName, lastName: people.lastName, email: people.email, phone: people.phone };
  const notDeceased = eq(people.isDeceased, false);
  let rows: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }[];

  if (audience.type === "all") {
    rows = await db
      .select(base)
      .from(members)
      .innerJoin(people, eq(people.id, members.personId))
      .where(and(eq(members.organizationId, organizationId), eq(members.status, "active"), notDeceased));
  } else if (audience.type === "people") {
    rows = audience.personIds.length
      ? await db.select(base).from(people).where(and(eq(people.organizationId, organizationId), inArray(people.id, audience.personIds), notDeceased))
      : [];
  } else {
    const groupIds = audience.targets.filter((t) => t.type === "group").map((t) => t.id);
    const ministryIds = audience.targets.filter((t) => t.type === "ministry").map((t) => t.id);
    const [byGroup, byMinistry] = await Promise.all([
      groupIds.length
        ? db
            .select(base)
            .from(groupMembers)
            .innerJoin(people, eq(people.id, groupMembers.personId))
            .where(and(eq(groupMembers.organizationId, organizationId), inArray(groupMembers.groupId, groupIds), eq(groupMembers.isActive, true), notDeceased))
        : [],
      ministryIds.length
        ? db
            .select(base)
            .from(ministryMembers)
            .innerJoin(people, eq(people.id, ministryMembers.personId))
            .where(and(eq(ministryMembers.organizationId, organizationId), inArray(ministryMembers.ministryId, ministryIds), eq(ministryMembers.isActive, true), notDeceased))
        : [],
    ]);
    rows = [...byGroup, ...byMinistry];
  }

  const seen = new Set<string>();
  const recipients: ResolvedRecipient[] = [];
  let withoutContact = 0;
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const address = channel === "sms" ? normalizePhone(r.phone) : r.email?.trim() || null;
    if (!address) {
      withoutContact++;
      continue;
    }
    recipients.push({ personId: r.id, firstName: r.firstName, lastName: r.lastName, address });
  }
  return { recipients, withoutContact };
}

function personalize(text: string, r: ResolvedRecipient) {
  return text.replace(/\{\{\s*prenom\s*\}\}/gi, r.firstName).replace(/\{\{\s*nom\s*\}\}/gi, r.lastName);
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Envoie une campagne (`messages`) : une ligne `notifications` par destinataire avec le vrai statut. Le
 * message est « réservé » par un `update … where sent_at is null` atomique : deux appels simultanés (clic
 * double, cron + action) n'envoient jamais deux fois.
 */
export async function dispatchMessage(
  messageId: string,
  organizationId: string,
): Promise<{ error?: string; sent: number; failed: number; skipped: number }> {
  const [claimed] = await db
    .update(messages)
    .set({ sentAt: new Date() })
    .where(and(eq(messages.id, messageId), eq(messages.organizationId, organizationId), isNull(messages.sentAt)))
    .returning();
  if (!claimed) return { error: "Message introuvable ou déjà envoyé.", sent: 0, failed: 0, skipped: 0 };

  const release = async (error: string) => {
    await db.update(messages).set({ sentAt: null }).where(eq(messages.id, messageId));
    return { error, sent: 0, failed: 0, skipped: 0 };
  };

  const channel = claimed.channel === "sms" ? "sms" : claimed.channel === "email" ? "email" : null;
  if (!channel) return release("Canal non pris en charge.");
  if (channel === "sms" && !isSmsConfigured()) return release("L'envoi de SMS n'est pas configuré (variables TWILIO_* manquantes).");
  if (channel === "email" && !process.env.RESEND_API_KEY) return release("L'envoi d'emails n'est pas configuré (RESEND_API_KEY manquante).");

  const audience = parseAudience(claimed.recipientFilter);
  const { recipients, withoutContact } = await resolveRecipients(organizationId, audience, channel);
  if (recipients.length === 0) {
    return release(channel === "sms" ? "Aucun destinataire n'a de numéro de téléphone valide." : "Aucun destinataire n'a d'adresse email.");
  }

  let sent = 0;
  let failed = 0;
  const resend = channel === "email" ? getResendClient() : null;

  const sendOne = async (r: ResolvedRecipient) => {
    const text = personalize(claimed.body, r);
    const subject = personalize(claimed.subject ?? "", r);
    const [notification] = await db
      .insert(notifications)
      .values({
        organizationId,
        personId: r.personId,
        channel,
        title: subject || text.slice(0, 80),
        body: text,
        status: "queued",
        data: { messageId },
      })
      .returning({ id: notifications.id });
    if (!notification) return;
    try {
      let providerId: string;
      if (channel === "sms") {
        providerId = (await sendSms(r.address, text)).id;
      } else {
        const { data, error } = await resend!.emails.send({
          from: EMAIL_FROM,
          to: r.address,
          subject,
          html: `<div style="font-family:sans-serif;white-space:pre-wrap">${escapeHtml(text)}</div>`,
        });
        if (error || !data) throw new Error(error?.message ?? "Échec inconnu");
        providerId = data.id;
      }
      await db
        .update(notifications)
        .set({ status: "sent", sentAt: new Date(), data: { messageId, providerId } })
        .where(eq(notifications.id, notification.id));
      sent++;
    } catch (err) {
      await db
        .update(notifications)
        .set({ status: "failed", data: { messageId, error: err instanceof Error ? err.message : "Échec inconnu" } })
        .where(eq(notifications.id, notification.id));
      failed++;
    }
  };

  for (let i = 0; i < recipients.length; i += 10) {
    await Promise.all(recipients.slice(i, i + 10).map(sendOne));
  }

  // Tout a échoué : on ne laisse pas la campagne « envoyée » (elle redevient brouillon, réessayable).
  if (sent === 0 && failed > 0) {
    await db.delete(notifications).where(and(eq(notifications.organizationId, organizationId), sql`${notifications.data} ->> 'messageId' = ${messageId}`));
    return release("Aucun message n'a pu être envoyé (vérifiez la configuration du fournisseur).");
  }
  return { sent, failed, skipped: withoutContact };
}
