"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { plans } from "@/lib/db/schema";
import { getPaymentProvider } from "@/lib/payments";
import { getCurrentSubscription, getOrganizationBillingInfo } from "@/features/billing/queries";
import { mapStripeStatus, type PlanFeatures } from "@/features/billing/schemas";

export interface BillingActionState {
  error?: string;
  success?: boolean;
  checkoutUrl?: string;
}

/**
 * Changement de plan (critère de sortie explicite de cette phase). Trois issues possibles :
 * 1. Passage au plan FREE → annule l'abonnement Stripe existant s'il y en a un, aucune Session
 *    Checkout (rien à payer).
 * 2. Abonnement Stripe déjà actif (`providerSubscriptionId` non nul) → changement direct via
 *    `subscriptions.update`, synchronisé immédiatement en base (pas de nouveau paiement collecté,
 *    Stripe proratise).
 * 3. Aucun abonnement Stripe encore (`trialing` ou plan FREE local) → renvoie `checkoutUrl`, la
 *    synchronisation locale n'a lieu qu'au retour via `syncCheckoutSession`.
 */
export async function changePlan(planCode: string, interval: "monthly" | "yearly"): Promise<BillingActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer la facturation." };

  const organizationId = check.organization.organization.id;
  const [targetPlan] = await db.select().from(plans).where(eq(plans.code, planCode));
  if (!targetPlan) return { error: "Plan introuvable." };

  const current = await getCurrentSubscription(organizationId);
  const supabase = await createClient();

  if (planCode === "FREE") {
    if (current?.subscription.provider === "stripe" && current.subscription.providerSubscriptionId) {
      try {
        await getPaymentProvider().cancelSubscription(current.subscription.providerSubscriptionId);
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Échec de l'annulation de l'abonnement Stripe." };
      }
    }
    const patch = {
      plan_id: targetPlan.id,
      status: "active",
      billing_interval: interval,
      provider_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      cancelled_at: null,
    };
    const { error } = current
      ? await supabase.from("subscriptions").update(patch).eq("id", current.subscription.id)
      : await supabase.from("subscriptions").insert({ organization_id: organizationId, ...patch });
    if (error) return { error: error.message };

    revalidatePath("/settings/billing");
    return { success: true };
  }

  const features = (targetPlan.features ?? {}) as PlanFeatures;
  const priceId = interval === "yearly" ? features.stripePriceIdYearly : features.stripePriceIdMonthly;
  if (!priceId) {
    return { error: "Ce plan n'est pas encore configuré pour la facturation en ligne (identifiant Stripe manquant)." };
  }

  const org = await getOrganizationBillingInfo(organizationId);
  if (!org) return { error: "Organisation introuvable." };

  const provider = getPaymentProvider();
  const customerId = await provider.ensureCustomer({
    organizationId,
    email: org.email,
    name: org.name,
    existingCustomerId: current?.subscription.providerCustomerId ?? null,
  });
  const existingSubscriptionId =
    current?.subscription.provider === "stripe" ? current.subscription.providerSubscriptionId : null;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  let result;
  try {
    result = await provider.startOrChangeSubscription({
      customerId,
      existingSubscriptionId,
      priceId,
      successUrl: `${appUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/settings/billing?canceled=true`,
      metadata: { organizationId, planCode, interval },
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Échec de la communication avec Stripe." };
  }

  if (result.checkoutUrl) return { success: true, checkoutUrl: result.checkoutUrl };

  const patch = {
    plan_id: targetPlan.id,
    status: mapStripeStatus(result.status),
    billing_interval: interval,
    provider: "stripe",
    provider_customer_id: result.providerCustomerId,
    provider_subscription_id: result.providerSubscriptionId,
    current_period_start: result.currentPeriodStart?.toISOString() ?? null,
    current_period_end: result.currentPeriodEnd?.toISOString() ?? null,
  };
  const { error } = current
    ? await supabase.from("subscriptions").update(patch).eq("id", current.subscription.id)
    : await supabase.from("subscriptions").insert({ organization_id: organizationId, ...patch });
  if (error) return { error: error.message };

  revalidatePath("/settings/billing");
  return { success: true };
}

/**
 * Appelé depuis la page au retour de Stripe Checkout (`?session_id=...`) — voir la note dans
 * `stripe-provider.ts` : ce flux synchrone remplace un webhook, impossible à recevoir de manière
 * fiable depuis une instance de développement locale sans URL publique.
 */
export async function syncCheckoutSession(sessionId: string): Promise<BillingActionState> {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer la facturation." };

  const organizationId = check.organization.organization.id;
  let result;
  try {
    result = await getPaymentProvider().retrieveCheckoutSession(sessionId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Échec de la confirmation du paiement." };
  }

  if (result.metadata.organizationId !== organizationId) {
    return { error: "Cette session de paiement n'appartient pas à votre organisation." };
  }

  const [targetPlan] = await db.select().from(plans).where(eq(plans.code, result.metadata.planCode ?? ""));
  if (!targetPlan) return { error: "Plan introuvable pour cette session de paiement." };

  const current = await getCurrentSubscription(organizationId);
  const supabase = await createClient();
  const patch = {
    plan_id: targetPlan.id,
    status: mapStripeStatus(result.status),
    billing_interval: result.metadata.interval ?? "monthly",
    provider: "stripe",
    provider_customer_id: result.providerCustomerId,
    provider_subscription_id: result.providerSubscriptionId,
    current_period_start: result.currentPeriodStart?.toISOString() ?? null,
    current_period_end: result.currentPeriodEnd?.toISOString() ?? null,
  };
  const { error } = current
    ? await supabase.from("subscriptions").update(patch).eq("id", current.subscription.id)
    : await supabase.from("subscriptions").insert({ organization_id: organizationId, ...patch });
  if (error) return { error: error.message };

  revalidatePath("/settings/billing");
  return { success: true };
}
