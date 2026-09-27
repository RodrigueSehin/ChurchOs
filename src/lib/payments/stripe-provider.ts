import "server-only";
import Stripe from "stripe";

import type { InvoiceSummary, PaymentProvider, PlanChangeResult } from "./types";

let client: Stripe | null = null;

/** Client Stripe paresseux — la clé n'est lue qu'au premier appel réel, jamais au chargement du
 * module, pour ne jamais faire échouer un `npm run build` sans `STRIPE_SECRET_KEY` (même motif
 * que `lib/email/resend.ts` en Phase 11). */
function getClient(): Stripe {
  if (!client) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) throw new Error("STRIPE_SECRET_KEY n'est pas configurée.");
    client = new Stripe(apiKey);
  }
  return client;
}

function toDate(unixSeconds: number | null | undefined): Date | null {
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
}

function subscriptionToResult(sub: Stripe.Subscription): PlanChangeResult {
  const item = sub.items.data[0];
  return {
    status: sub.status,
    providerCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    providerSubscriptionId: sub.id,
    currentPeriodStart: toDate(item?.current_period_start ?? null),
    currentPeriodEnd: toDate(item?.current_period_end ?? null),
  };
}

export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";

  async ensureCustomer(params: {
    organizationId: string;
    email: string | null;
    name: string;
    existingCustomerId: string | null;
  }): Promise<string> {
    if (params.existingCustomerId) return params.existingCustomerId;
    const stripe = getClient();
    const customer = await stripe.customers.create({
      name: params.name,
      email: params.email ?? undefined,
      metadata: { organizationId: params.organizationId },
    });
    return customer.id;
  }

  async startOrChangeSubscription(params: {
    customerId: string;
    existingSubscriptionId: string | null;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }): Promise<PlanChangeResult> {
    const stripe = getClient();

    // Un abonnement Stripe déjà actif : changement de plan direct (pas de nouveau paiement de
    // départ à collecter, Stripe proratise automatiquement) — jamais de Checkout Session ici.
    if (params.existingSubscriptionId) {
      const current = await stripe.subscriptions.retrieve(params.existingSubscriptionId);
      const item = current.items.data[0];
      if (!item) throw new Error("Abonnement Stripe sans ligne à mettre à jour.");
      const updated = await stripe.subscriptions.update(params.existingSubscriptionId, {
        items: [{ id: item.id, price: params.priceId }],
        proration_behavior: "create_prorations",
        metadata: params.metadata,
      });
      return subscriptionToResult(updated);
    }

    // Pas d'abonnement Stripe existant : premier paiement à collecter via une session Checkout
    // hébergée — la mise à jour locale n'a lieu qu'au retour (`retrieveCheckoutSession`), jamais
    // ici, puisque le paiement n'est pas encore confirmé à ce stade.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
      subscription_data: { metadata: params.metadata },
    });
    if (!session.url) throw new Error("Échec de la création de la session de paiement Stripe.");

    return {
      status: "pending_checkout",
      providerCustomerId: params.customerId,
      providerSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      checkoutUrl: session.url,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const stripe = getClient();
    await stripe.subscriptions.cancel(subscriptionId);
  }

  async retrieveCheckoutSession(sessionId: string): Promise<PlanChangeResult & { metadata: Record<string, string> }> {
    const stripe = getClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
    const sub = session.subscription;
    if (!sub || typeof sub === "string") {
      throw new Error("Session de paiement Stripe sans abonnement associé (paiement non finalisé ?).");
    }
    return { ...subscriptionToResult(sub), metadata: session.metadata ?? {} };
  }

  async listInvoices(customerId: string, limit = 10): Promise<InvoiceSummary[]> {
    const stripe = getClient();
    const invoices = await stripe.invoices.list({ customer: customerId, limit });
    return invoices.data.map((inv) => ({
      id: inv.id ?? "",
      number: inv.number,
      status: inv.status ?? "draft",
      amountDue: inv.amount_due,
      currency: inv.currency,
      created: new Date(inv.created * 1000),
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      pdfUrl: inv.invoice_pdf ?? null,
    }));
  }
}
