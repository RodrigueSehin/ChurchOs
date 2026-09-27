import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;

/** Client Resend paresseux (une seule instance par process) — la clé n'est lue qu'au premier
 * envoi réel, jamais au chargement du module, pour ne pas faire échouer un `npm run build` sans
 * `RESEND_API_KEY` (ex. CI). */
export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY n'est pas configurée.");
    client = new Resend(apiKey);
  }
  return client;
}

/** Domaine de test fourni par Resend, utilisable sans vérification de domaine — suffisant pour
 * le sandbox de cette phase (voir la sortie attendue : "un envoi réel en sandbox"). */
export const EMAIL_FROM = "ChurchOS <onboarding@resend.dev>";
