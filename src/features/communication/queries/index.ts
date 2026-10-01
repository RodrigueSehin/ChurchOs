import "server-only";
import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  announcementReads,
  announcements,
  groups,
  members,
  messageTemplates,
  messages,
  ministries,
  notifications,
  people,
} from "@/lib/db/schema";
import { audienceLabel } from "@/features/communication/schemas";

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

/* ------------------------------------------------------------------ */
/* Page /communication (refonte) : fil unifié annonces + messages       */
/* ------------------------------------------------------------------ */

export const FEED_PAGE_SIZE = 10;

export type FeedStatus = "draft" | "scheduled" | "published" | "archived";

export interface FeedItem {
  id: string;
  kind: "announcement" | "message";
  title: string;
  excerpt: string;
  imageUrl: string | null;
  status: FeedStatus;
  /** Date de publication (annonce) ou d'envoi / planification (message), à défaut la création. */
  date: Date;
  recipients: string;
  views: number;
  /** Annonce complète (modification / lecture) — absente pour un message. */
  announcement?: typeof announcements.$inferSelect;
  channel?: string;
}

function excerptOf(text: string, max = 80) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** Annonces et messages fusionnés dans un même fil (comme sur la maquette). Les volumes d'une église
 * restent modestes : on charge les deux listes (colonnes utiles seulement) et on filtre / trie / pagine
 * ici plutôt que d'écrire une union SQL. */
async function loadFeed(organizationId: string): Promise<FeedItem[]> {
  const [announcementRows, messageRows, readCounts, recipientStats] = await Promise.all([
    db.select().from(announcements).where(eq(announcements.organizationId, organizationId)),
    db.select().from(messages).where(eq(messages.organizationId, organizationId)),
    db
      .select({ id: announcementReads.announcementId, value: count() })
      .from(announcementReads)
      .where(eq(announcementReads.organizationId, organizationId))
      .groupBy(announcementReads.announcementId),
    db
      .select({
        messageId: sql<string>`${notifications.data} ->> 'messageId'`,
        total: sql<number>`count(*)::int`,
        read: sql<number>`count(*) filter (where ${notifications.status} = 'read')::int`,
      })
      .from(notifications)
      .where(and(eq(notifications.organizationId, organizationId), sql`${notifications.data} ->> 'messageId' is not null`))
      .groupBy(sql`${notifications.data} ->> 'messageId'`),
  ]);

  const reads = new Map(readCounts.map((r) => [r.id, r.value]));
  const stats = new Map(recipientStats.map((r) => [r.messageId, r]));
  const now = Date.now();

  const items: FeedItem[] = [];
  for (const a of announcementRows) {
    items.push({
      id: a.id,
      kind: "announcement",
      title: a.title,
      excerpt: excerptOf(a.content),
      imageUrl: a.imageUrl,
      status: a.status as FeedStatus,
      date: a.publishAt ?? a.createdAt,
      recipients: audienceLabel(a.audienceFilter),
      views: reads.get(a.id) ?? 0,
      announcement: a,
    });
  }
  for (const m of messageRows) {
    const stat = stats.get(m.id);
    const status: FeedStatus = m.sentAt ? "published" : m.scheduledAt && m.scheduledAt.getTime() > now ? "scheduled" : "draft";
    items.push({
      id: m.id,
      kind: "message",
      title: m.subject || excerptOf(m.body, 60),
      excerpt: excerptOf(m.body),
      imageUrl: null,
      status,
      date: m.sentAt ?? m.scheduledAt ?? m.createdAt,
      recipients: stat ? `${stat.total} destinataire${stat.total > 1 ? "s" : ""}` : "—",
      views: stat?.read ?? 0,
      channel: m.channel,
    });
  }
  return items.sort((x, y) => y.date.getTime() - x.date.getTime());
}

export async function getCommunicationFeed({
  organizationId,
  search,
  view = "",
  page = 1,
}: {
  organizationId: string;
  search?: string;
  /** "" (toutes) | announcement | message | draft | scheduled */
  view?: string;
  page?: number;
}) {
  const all = await loadFeed(organizationId);
  const counts = {
    all: all.length,
    announcement: all.filter((i) => i.kind === "announcement").length,
    message: all.filter((i) => i.kind === "message").length,
    draft: all.filter((i) => i.status === "draft").length,
    scheduled: all.filter((i) => i.status === "scheduled").length,
  };

  const term = search?.trim().toLowerCase();
  const filtered = all.filter((i) => {
    if (term && !`${i.title} ${i.excerpt}`.toLowerCase().includes(term)) return false;
    if (view === "announcement" || view === "message") return i.kind === view;
    if (view === "draft" || view === "scheduled") return i.status === view;
    return true;
  });

  return {
    rows: filtered.slice((page - 1) * FEED_PAGE_SIZE, page * FEED_PAGE_SIZE),
    total: filtered.length,
    pageSize: FEED_PAGE_SIZE,
    counts,
    // Réutilisé par les panneaux latéraux (évite de recharger le fil).
    all,
  };
}

export async function getCommunicationKpis(organizationId: string, all: FeedItem[]) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const publishedAnnouncements = all.filter((i) => i.kind === "announcement" && i.status === "published");
  const sentMessages = all.filter((i) => i.kind === "message" && i.status === "published");
  const growth = (items: FeedItem[]) => {
    const recent = items.filter((i) => i.date >= monthStart).length;
    const before = items.length - recent;
    return before > 0 ? Math.round((recent / before) * 100) : null;
  };

  const [[reached], [memberStats]] = await Promise.all([
    db
      .select({ value: sql<number>`count(distinct ${notifications.personId})::int` })
      .from(notifications)
      .where(and(eq(notifications.organizationId, organizationId), sql`${notifications.data} ->> 'messageId' is not null`)),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(members)
      .where(and(eq(members.organizationId, organizationId), eq(members.status, "active"))),
  ]);

  const activeMembers = memberStats?.value ?? 0;
  // Taux de lecture moyen = moyenne, sur les annonces publiées, de (lecteurs distincts / membres actifs).
  const readRate =
    publishedAnnouncements.length === 0 || activeMembers === 0
      ? null
      : Math.round(
          (publishedAnnouncements.reduce((sum, a) => sum + Math.min(1, a.views / activeMembers), 0) / publishedAnnouncements.length) * 100,
        );

  return {
    publishedAnnouncements: { value: publishedAnnouncements.length, growthPct: growth(publishedAnnouncements) },
    sentMessages: { value: sentMessages.length, growthPct: growth(sentMessages) },
    membersReached: reached?.value ?? 0,
    readRate,
  };
}

/** Répartition en 4 groupes exclusifs (annonces publiées, messages envoyés, brouillons, planifiés) + archivées si présentes. */
export function getTypeDistribution(all: FeedItem[]) {
  const rows = [
    { title: "Annonces", value: all.filter((i) => i.kind === "announcement" && i.status === "published").length },
    { title: "Messages", value: all.filter((i) => i.kind === "message" && i.status === "published").length },
    { title: "Brouillons", value: all.filter((i) => i.status === "draft").length },
    { title: "Planifiées", value: all.filter((i) => i.status === "scheduled").length },
    { title: "Archivées", value: all.filter((i) => i.status === "archived").length },
  ];
  return rows.filter((r) => r.value > 0);
}

/** Destinataires les plus fréquents (annonces : audience ciblée ; messages : regroupés en « Envois directs »). */
export function getAudienceBreakdown(all: FeedItem[]) {
  const counts = new Map<string, number>();
  for (const i of all) {
    const label = i.kind === "announcement" ? i.recipients : "Envois directs (messages)";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

/** Groupes et ministères actifs proposés comme destinataires d'une annonce. */
export async function getAudienceOptions(organizationId: string) {
  const [groupRows, ministryRows] = await Promise.all([
    db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.organizationId, organizationId)).orderBy(asc(groups.name)),
    db
      .select({ id: ministries.id, name: ministries.name })
      .from(ministries)
      .where(and(eq(ministries.organizationId, organizationId), eq(ministries.status, "active")))
      .orderBy(asc(ministries.name)),
  ]);
  return { groups: groupRows, ministries: ministryRows };
}
