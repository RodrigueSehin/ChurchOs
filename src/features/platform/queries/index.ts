import "server-only";
import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  authUsers,
  campuses,
  members,
  organizationMemberships,
  organizations,
  plans,
  subscriptions,
} from "@/lib/db/schema";

type OrgStatus = (typeof organizations.$inferSelect)["status"];

export const PLATFORM_PAGE_SIZE = 20;

const LIVE_SUBSCRIPTION = ["trialing", "active", "past_due", "paused"] as const;

export async function getPlatformOverview() {
  const [orgByStatus, [users], [memberTotal], subs] = await Promise.all([
    db.select({ status: organizations.status, total: count() }).from(organizations).groupBy(organizations.status),
    db.select({ total: count() }).from(authUsers),
    db.select({ total: count() }).from(members),
    db
      .select({
        planCode: plans.code,
        planName: plans.name,
        status: subscriptions.status,
        interval: subscriptions.billingInterval,
        priceMonthly: plans.priceMonthly,
        priceYearly: plans.priceYearly,
        currency: plans.currency,
        total: count(),
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(inArray(subscriptions.status, [...LIVE_SUBSCRIPTION]))
      .groupBy(
        plans.code,
        plans.name,
        subscriptions.status,
        subscriptions.billingInterval,
        plans.priceMonthly,
        plans.priceYearly,
        plans.currency,
      ),
  ]);

  const organizationsByStatus = Object.fromEntries(orgByStatus.map((r) => [r.status, r.total])) as Partial<
    Record<OrgStatus, number>
  >;

  // MRR estimé : abonnements `active` uniquement (pas les essais), annuel ramené au mois.
  let mrr = 0;
  const byPlan = new Map<string, { name: string; total: number }>();
  for (const s of subs) {
    const entry = byPlan.get(s.planCode) ?? { name: s.planName, total: 0 };
    entry.total += s.total;
    byPlan.set(s.planCode, entry);
    if (s.status === "active") {
      const monthly = s.interval === "yearly" ? Number(s.priceYearly) / 12 : Number(s.priceMonthly);
      mrr += monthly * s.total;
    }
  }

  return {
    organizationsByStatus,
    organizationsTotal: orgByStatus.reduce((sum, r) => sum + r.total, 0),
    usersTotal: users?.total ?? 0,
    membersTotal: memberTotal?.total ?? 0,
    subscriptionsByPlan: [...byPlan.entries()].map(([code, v]) => ({ code, ...v })),
    mrr: Math.round(mrr),
    currency: subs[0]?.currency ?? "XOF",
  };
}

export interface PlatformOrganizationFilters {
  q?: string;
  status?: string;
  page: number;
}

const ORG_STATUSES: OrgStatus[] = ["trial", "active", "suspended", "archived"];

export async function getPlatformOrganizations({ q, status, page }: PlatformOrganizationFilters) {
  const conditions = [];
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conditions.push(or(ilike(organizations.name, pattern), ilike(organizations.email, pattern), ilike(organizations.city, pattern)));
  }
  if (status && (ORG_STATUSES as string[]).includes(status)) {
    conditions.push(eq(organizations.status, status as OrgStatus));
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        city: organizations.city,
        countryCode: organizations.countryCode,
        email: organizations.email,
        status: organizations.status,
        createdAt: organizations.createdAt,
        planName: plans.name,
        subscriptionStatus: subscriptions.status,
        memberCount: sql<number>`(select count(*)::int from ${members} where ${members.organizationId} = ${organizations.id})`,
        userCount: sql<number>`(select count(*)::int from ${organizationMemberships} where ${organizationMemberships.organizationId} = ${organizations.id} and ${organizationMemberships.status} = 'active')`,
      })
      .from(organizations)
      .leftJoin(
        subscriptions,
        and(
          eq(subscriptions.organizationId, organizations.id),
          inArray(subscriptions.status, [...LIVE_SUBSCRIPTION]),
        ),
      )
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(where)
      .orderBy(desc(organizations.createdAt))
      .limit(PLATFORM_PAGE_SIZE)
      .offset((page - 1) * PLATFORM_PAGE_SIZE),
    db.select({ total: count() }).from(organizations).where(where),
  ]);

  return { rows, total: total?.total ?? 0 };
}

export async function getPlatformOrganizationDetail(id: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  if (!org) return null;

  const [[subscription], [memberTotal], [userTotal], [campusTotal]] = await Promise.all([
    db
      .select({
        status: subscriptions.status,
        interval: subscriptions.billingInterval,
        provider: subscriptions.provider,
        trialEndsAt: subscriptions.trialEndsAt,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        planName: plans.name,
        planCode: plans.code,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(and(eq(subscriptions.organizationId, id), inArray(subscriptions.status, [...LIVE_SUBSCRIPTION]))),
    db.select({ total: count() }).from(members).where(eq(members.organizationId, id)),
    db
      .select({ total: count() })
      .from(organizationMemberships)
      .where(and(eq(organizationMemberships.organizationId, id), eq(organizationMemberships.status, "active"))),
    db.select({ total: count() }).from(campuses).where(eq(campuses.organizationId, id)),
  ]);

  return {
    org,
    subscription: subscription ?? null,
    memberTotal: memberTotal?.total ?? 0,
    userTotal: userTotal?.total ?? 0,
    campusTotal: campusTotal?.total ?? 0,
  };
}
