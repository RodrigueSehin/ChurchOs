export type SupportLevel = "community" | "email" | "email_chat" | "dedicated";

export interface PlanFeatures {
  members?: boolean;
  pastoral?: boolean;
  ministries?: boolean;
  events?: boolean;
  finance?: boolean;
  training?: boolean;
  communication?: boolean;
  documents?: boolean;
  analytics?: boolean;
  multi_campus?: boolean;
  support?: SupportLevel;
  /** Identifiants Stripe (Price) — absents pour un plan sans coût réel (FREE) ou pas encore
   * configuré. Stockés dans ce même jsonb plutôt que d'ajouter des colonnes dédiées à `plans`
   * (voir db/scripts/setup-stripe-billing.ts). */
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

/** Miroir exact de l'enum réel `public.subscription_status` (db/schema.sql) : `trialing`,
 * `active`, `past_due`, `cancelled`, `paused`, `expired` — pas de `incomplete`/`unpaid`/orthographe
 * américaine `canceled`, contrairement aux statuts natifs Stripe (voir `mapStripeStatus`). */
export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trialing: "Essai",
  active: "Actif",
  past_due: "Paiement en retard",
  cancelled: "Annulé",
  paused: "En pause",
  expired: "Expiré",
};

/** Stripe utilise son propre jeu de statuts (orthographe américaine `canceled`, plus
 * `incomplete`/`incomplete_expired`/`unpaid` qui n'existent pas dans notre enum) — traduit vers
 * `public.subscription_status` avant toute écriture, sinon Postgres rejette la valeur. */
export function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "canceled":
      return "cancelled";
    case "incomplete":
    case "unpaid":
      return "past_due";
    case "incomplete_expired":
      return "expired";
    default:
      // trialing / active / past_due / paused correspondent déjà exactement.
      return stripeStatus;
  }
}

export const BILLING_INTERVAL_LABELS: Record<string, string> = {
  monthly: "Mensuel",
  yearly: "Annuel",
};
