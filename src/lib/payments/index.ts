import "server-only";

import { StripeProvider } from "./stripe-provider";
import type { PaymentProvider } from "./types";

export type { InvoiceSummary, PaymentProvider, PlanChangeResult } from "./types";

/** Point d'entrée unique — le reste de l'app appelle `getPaymentProvider()`, jamais
 * `new StripeProvider()` directement (voir la note d'abstraction dans `types.ts`). */
export function getPaymentProvider(): PaymentProvider {
  return new StripeProvider();
}
