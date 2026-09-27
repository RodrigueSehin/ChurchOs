/**
 * Abstraction "PaymentProvider" (critère de contenu explicite de cette phase) : tout le reste de
 * l'application (Server Actions, UI) dépend uniquement de cette interface, jamais du SDK `stripe`
 * directement — seul `stripe-provider.ts` importe `stripe`. Un futur second fournisseur
 * (ex. CinetPay, plus courant en Afrique de l'Ouest que Stripe pour les paiements locaux)
 * n'aurait qu'à implémenter cette même interface, sans toucher aux Server Actions ni à l'UI.
 */

export interface PlanChangeResult {
  /** Statut d'abonnement réel côté fournisseur (ex. `active`, `trialing`, `incomplete`). */
  status: string;
  providerCustomerId: string;
  providerSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  /** Présent seulement quand un paiement initial est requis (nouvel abonnement payant) — le
   * client doit rediriger vers cette URL plutôt qu'attendre une mise à jour synchrone. */
  checkoutUrl?: string;
}

export interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string;
  amountDue: number;
  currency: string;
  created: Date;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
}

export interface PaymentProvider {
  readonly name: string;

  /** Crée un client chez le fournisseur si `existingCustomerId` est absent, sinon le réutilise. */
  ensureCustomer(params: {
    organizationId: string;
    email: string | null;
    name: string;
    existingCustomerId: string | null;
  }): Promise<string>;

  /**
   * Démarre un nouvel abonnement payant (retourne `checkoutUrl`, aucune mise à jour locale
   * possible avant le retour de paiement) ou change le plan d'un abonnement déjà actif chez le
   * fournisseur (mise à jour directe, sans re-paiement — `existingSubscriptionId` non nul).
   */
  startOrChangeSubscription(params: {
    customerId: string;
    existingSubscriptionId: string | null;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }): Promise<PlanChangeResult>;

  cancelSubscription(subscriptionId: string): Promise<void>;

  /** Appelé au retour du paiement hébergé (`successUrl?session_id=...`) pour confirmer et
   * récupérer l'état réel de l'abonnement créé — voir la note dans `stripe-provider.ts` sur
   * pourquoi ce flux synchrone remplace un webhook impossible à recevoir en développement local. */
  retrieveCheckoutSession(sessionId: string): Promise<PlanChangeResult & { metadata: Record<string, string> }>;

  listInvoices(customerId: string, limit?: number): Promise<InvoiceSummary[]>;
}
