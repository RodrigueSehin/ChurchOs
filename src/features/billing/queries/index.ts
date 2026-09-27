import "server-only";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { organizations, plans, subscriptions } from "@/lib/db/schema";

/** Un abonnement "actif" au sens métier (voir l'index partiel `subscriptions_active_org_idx` dans
 * db/schema.sql) — un seul par organisation à la fois. */
const ACTIVE_STATUSES = ["trialing", "active", "past_due", "paused"];

export async function getCurrentSubscription(organizationId: string) {
  const rows = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.organizationId, organizationId));

  return rows.find((r) => ACTIVE_STATUSES.includes(r.subscription.status)) ?? rows[0] ?? null;
}

export async function getPlans() {
  return db.select().from(plans).where(eq(plans.isActive, true)).orderBy(asc(plans.priceMonthly));
}

export async function getOrganizationBillingInfo(organizationId: string) {
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name, email: organizations.email })
    .from(organizations)
    .where(eq(organizations.id, organizationId));
  return org ?? null;
}
