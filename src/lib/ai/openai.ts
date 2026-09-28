import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

/** Client OpenAI paresseux — la clé n'est lue qu'au premier appel réel, jamais au chargement du
 * module (même motif que `lib/email/resend.ts` et `lib/payments/stripe-provider.ts`). */
export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY n'est pas configurée.");
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const AI_MODEL = "gpt-4o-mini";
