import "server-only";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { announcements, messageTemplates, messages, notifications, people } from "@/lib/db/schema";

export const ANNOUNCEMENTS_PAGE_SIZE = 20;
export const MESSAGES_PAGE_SIZE = 20;

export async function getAnnouncements({
  organizationId,
  search,
  page = 1,
}: {
  organizationId: string;
  search?: string;
  page?: number;
}) {
  const conditions = [eq(announcements.organizationId, organizationId)];
  if (search?.trim()) conditions.push(ilike(announcements.title, `%${search.trim()}%`));
  const where = and(...conditions);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(announcements)
      .where(where)
      .orderBy(desc(announcements.createdAt))
      .limit(ANNOUNCEMENTS_PAGE_SIZE)
      .offset((page - 1) * ANNOUNCEMENTS_PAGE_SIZE),
    db.select({ value: count() }).from(announcements).where(where),
  ]);

  return { rows, total: totalRows[0]?.value ?? 0, page, pageSize: ANNOUNCEMENTS_PAGE_SIZE };
}

export async function getTemplates(organizationId: string) {
  return db
    .select()
    .from(messageTemplates)
    .where(eq(messageTemplates.organizationId, organizationId))
    .orderBy(asc(messageTemplates.channel), asc(messageTemplates.name));
}

export async function getEmailTemplatesForSelect(organizationId: string) {
  const rows = await db
    .select({ id: messageTemplates.id, name: messageTemplates.name, subject: messageTemplates.subject, body: messageTemplates.body })
    .from(messageTemplates)
    .where(
      and(
        eq(messageTemplates.organizationId, organizationId),
        eq(messageTemplates.channel, "email"),
        eq(messageTemplates.isActive, true),
      ),
    )
    .orderBy(asc(messageTemplates.name));
  return rows;
}

/**
 * `messages` (une campagne) et `notifications` (une ligne par destinataire, avec le vrai statut
 * d'envoi) ne sont pas reliées par une clé étrangère dans le schéma réel — `notifications` a été
 * conçue pour les notifications individuelles, pas pour tracer une campagne. On stocke donc
 * `{ messageId }` dans `notifications.data` (jsonb, prévu pour ce type de métadonnée libre) au
 * moment de l'envoi, plutôt que d'ajouter une colonne : voir `sendMessage` dans
 * `features/communication/actions`.
 */
export async function getMessages({ organizationId, page = 1 }: { organizationId: string; page?: number }) {
  const where = eq(messages.organizationId, organizationId);
  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(where)
      .orderBy(desc(messages.createdAt))
      .limit(MESSAGES_PAGE_SIZE)
      .offset((page - 1) * MESSAGES_PAGE_SIZE),
    db.select({ value: count() }).from(messages).where(where),
  ]);

  const recipientSummaries = await Promise.all(
    rows.map(async (m) => {
      const recipients = await db
        .select({ status: notifications.status })
        .from(notifications)
        .where(and(eq(notifications.organizationId, organizationId), sql`${notifications.data} ->> 'messageId' = ${m.id}`));
      const counts: Record<string, number> = {};
      for (const r of recipients) counts[r.status] = (counts[r.status] ?? 0) + 1;
      return { messageId: m.id, total: recipients.length, counts };
    }),
  );
  const summaryByMessage = new Map(recipientSummaries.map((s) => [s.messageId, s]));

  return {
    rows: rows.map((m) => ({ ...m, recipients: summaryByMessage.get(m.id) ?? { total: 0, counts: {} } })),
    total: totalRows[0]?.value ?? 0,
    page,
    pageSize: MESSAGES_PAGE_SIZE,
  };
}

export async function getMessageRecipients(organizationId: string, messageId: string) {
  return db
    .select({
      id: notifications.id,
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      status: notifications.status,
      sentAt: notifications.sentAt,
    })
    .from(notifications)
    .leftJoin(people, eq(people.id, notifications.personId))
    .where(and(eq(notifications.organizationId, organizationId), sql`${notifications.data} ->> 'messageId' = ${messageId}`))
    .orderBy(asc(people.firstName));
}
