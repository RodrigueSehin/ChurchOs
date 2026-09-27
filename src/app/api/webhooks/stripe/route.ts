import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import { mapStripeStatus } from "@/features/billing/schemas";

/**
 * Route Handler (jamais une Server Action) appelée directement par Stripe, sans session
 * utilisateur — la seule autorisation est la signature `stripe-signature` vérifiée via
 * `STRIPE_WEBHOOK_SECRET`. Utilise donc le client admin Supabase (légitime ici, comme le scan QR
 * de la Phase 8 : RLS exige `is_org_member()`, qu'un appel serveur-à-serveur Stripe ne peut
 * jamais satisfaire). L'identifiant d'organisation vient exclusivement des métadonnées posées à
 * la création de l'abonnement (`changePlan`/`startOrChangeSubscription`), jamais d'une session.
 *
 * RÉSERVE CONNUE : ce endpoint n'a jamais pu être vérifié en conditions réelles pendant cette
 * phase — Stripe ne peut pas atteindre `localhost` sans tunnel public (ngrok) ou Stripe CLI
 * (`stripe listen --forward-to`), ni l'un ni l'autre disponibles dans cet environnement de
 * développement. Le critère de sortie de cette phase (upgrade/downgrade fonctionnel) est prouvé
 * par le flux synchrone `syncCheckoutSession`/changement direct dans `features/billing/actions`,
 * pas par ce webhook — même réserve, même raisonnement que le statut livré/échoué de Resend en
 * Phase 11.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!signature || !webhookSecret || !secretKey) {
    return NextResponse.json({ error: "Webhook Stripe non configuré." }, { status: 400 });
  }

  const body = await request.text();
  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature Stripe invalide : ${err instanceof Error ? err.message : "erreur inconnue"}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const organizationId = sub.metadata?.organizationId;
    if (organizationId) {
      const item = sub.items.data[0];
      await admin
        .from("subscriptions")
        .update({
          status: mapStripeStatus(sub.status),
          current_period_start: item?.current_period_start
            ? new Date(item.current_period_start * 1000).toISOString()
            : null,
          current_period_end: item?.current_period_end
            ? new Date(item.current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end,
        })
        .eq("organization_id", organizationId)
        .eq("provider_subscription_id", sub.id);
    }
  }

  return NextResponse.json({ received: true });
}
