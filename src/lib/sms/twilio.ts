import "server-only";


export function isSmsConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID));
}

/**
 * Numéro au format international E.164 (`+2250700000000`). Un numéro local à 10 chiffres est complété
 * avec l'indicatif du pays (par défaut Côte d'Ivoire, `SMS_DEFAULT_COUNTRY_CODE=225`).
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (!digits.startsWith("+")) {
    const cc = process.env.SMS_DEFAULT_COUNTRY_CODE ?? "225";
    digits = `+${cc}${digits.replace(/^0+(?=\d{10})/, "")}`;
  }
  return /^\+\d{8,15}$/.test(digits) ? digits : null;
}

/** Envoi d'un SMS via l'API REST Twilio (aucune dépendance). Lève une erreur au message lisible. */
export async function sendSms(to: string, body: string): Promise<{ id: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("SMS non configuré (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN manquants).");
  const params = new URLSearchParams({ To: to, Body: body });
  if (process.env.TWILIO_MESSAGING_SERVICE_SID) params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  else if (process.env.TWILIO_FROM) params.set("From", process.env.TWILIO_FROM);
  else throw new Error("SMS non configuré (TWILIO_FROM manquant).");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!res.ok || !json.sid) throw new Error(json.message ?? `Échec de l'envoi du SMS (${res.status}).`);
  return { id: json.sid };
}
