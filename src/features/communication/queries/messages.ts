import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { groups, members, messageTemplates, messages, ministries, notifications, people } from "@/lib/db/schema";
import { messageAudienceLabel, type MessageStatus } from "@/features/communication/schemas/messages";

export const MESSAGES_LIST_PAGE_SIZE = 8;

export interface MessageRow {
  id: string;
  channel: "sms" | "email";
  title: string;
  body: string;
  audience: string;
  date: Date;
  status: MessageStatus;
  total: number;
  delivered: number;
  failed: number;
  /** Données de formulaire pour « Modifier » (brouillon / planifié). */
  filter: unknown;
  scheduledAt: Date | null;
  templateId: string | null;
}

export async function getMessagesList({
  organizationId,
  view = "",
  search,
  page = 1,
}: {
  organizationId: string;
  /** "" | sms | email | draft | scheduled */
  view?: string;
  search?: string;
  page?: number;
}) {
  const [rows, stats] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(and(eq(messages.organizationId, organizationId), inArray(messages.channel, ["sms", "email"])))
      .orderBy(desc(messages.createdAt)),
    db
      .select({
        messageId: sql<string>`${notifications.data} ->> 'messageId'`,
        total: sql<number>`count(*)::int`,
        failed: sql<number>`count(*) filter (where ${notifications.status} = 'failed')::int`,
      })
      .from(notifications)
      .where(and(eq(notifications.organizationId, organizationId), inArray(notifications.channel, ["sms", "email"]), sql`${notifications.data} ->> 'messageId' is not null`))
      .groupBy(sql`${notifications.data} ->> 'messageId'`),
  ]);
  const byMessage = new Map(stats.map((s) => [s.messageId, s]));

  const all: MessageRow[] = rows
    .map((m) => {
      const s = byMessage.get(m.id);
      const status: MessageStatus = m.sentAt ? "sent" : m.scheduledAt ? "scheduled" : "draft";
      return {
        id: m.id,
        channel: m.channel as "sms" | "email",
        title: m.subject || m.body.replace(/\s+/g, " ").slice(0, 60),
        body: m.body,
        audience: messageAudienceLabel(m.recipientFilter),
        date: m.sentAt ?? m.scheduledAt ?? m.createdAt,
        status,
        total: s?.total ?? 0,
        delivered: (s?.total ?? 0) - (s?.failed ?? 0),
        failed: s?.failed ?? 0,
        filter: m.recipientFilter,
        scheduledAt: m.scheduledAt,
        templateId: m.templateId,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const counts = {
    all: all.length,
    sms: all.filter((m) => m.channel === "sms").length,
    email: all.filter((m) => m.channel === "email").length,
    draft: all.filter((m) => m.status === "draft").length,
    scheduled: all.filter((m) => m.status === "scheduled").length,
  };

  const term = search?.trim().toLowerCase();
  const filtered = all.filter((m) => {
    if (term && !`${m.title} ${m.body}`.toLowerCase().includes(term)) return false;
    if (view === "sms" || view === "email") return m.channel === view;
    if (view === "draft" || view === "scheduled") return m.status === view;
    return true;
  });

  return {
    rows: filtered.slice((page - 1) * MESSAGES_LIST_PAGE_SIZE, page * MESSAGES_LIST_PAGE_SIZE),
    total: filtered.length,
    pageSize: MESSAGES_LIST_PAGE_SIZE,
    counts,
    all,
  };
}

export async function getMessagesKpis(organizationId: string, all: MessageRow[]) {
  const sent = all.filter((m) => m.status === "sent");
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const recent = sent.filter((m) => m.date >= monthStart).length;
  const before = sent.length - recent;

  const [unique] = await db
    .select({ value: sql<number>`count(distinct ${notifications.personId})::int` })
    .from(notifications)
    .where(and(eq(notifications.organizationId, organizationId), inArray(notifications.channel, ["sms", "email"]), sql`${notifications.data} ->> 'messageId' is not null`));

  const attempts = sent.reduce((s, m) => s + m.total, 0);
  const ok = sent.reduce((s, m) => s + m.delivered, 0);
  return {
    sentCount: sent.length,
    growthPct: before > 0 ? Math.round((recent / before) * 100) : null,
    uniqueRecipients: unique?.value ?? 0,
    deliveryRate: attempts === 0 ? null : Math.round((ok / attempts) * 100),
  };
}

/** Groupes, ministères, personnes et modèles proposés dans le composeur. */
export async function getComposerOptions(organizationId: string) {
  const [groupRows, ministryRows, peopleRows, templates, [activeMembers]] = await Promise.all([
    db.select({ id: groups.id, name: groups.name }).from(groups).where(eq(groups.organizationId, organizationId)).orderBy(asc(groups.name)),
    db.select({ id: ministries.id, name: ministries.name }).from(ministries).where(and(eq(ministries.organizationId, organizationId), eq(ministries.status, "active"))).orderBy(asc(ministries.name)),
    db
      .select({ id: people.id, firstName: people.firstName, lastName: people.lastName, email: people.email, phone: people.phone })
      .from(people)
      .where(and(eq(people.organizationId, organizationId), eq(people.isDeceased, false)))
      .orderBy(asc(people.lastName), asc(people.firstName))
      .limit(2000),
    db
      .select({ id: messageTemplates.id, name: messageTemplates.name, channel: messageTemplates.channel, subject: messageTemplates.subject, body: messageTemplates.body })
      .from(messageTemplates)
      .where(and(eq(messageTemplates.organizationId, organizationId), eq(messageTemplates.isActive, true), inArray(messageTemplates.channel, ["sms", "email"])))
      .orderBy(asc(messageTemplates.name)),
    db.select({ value: sql<number>`count(*)::int` }).from(members).where(and(eq(members.organizationId, organizationId), eq(members.status, "active"))),
  ]);
  return {
    groups: groupRows,
    ministries: ministryRows,
    people: peopleRows.map((p) => ({ id: p.id, name: `${p.firstName} ${p.lastName}`, hasEmail: Boolean(p.email), hasPhone: Boolean(p.phone) })),
    templates: templates.map((t) => ({ ...t, channel: t.channel as "sms" | "email" })),
    activeMembers: activeMembers?.value ?? 0,
  };
}
