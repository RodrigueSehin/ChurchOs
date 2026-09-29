import "server-only";
import { randomBytes } from "crypto";
import QRCode from "qrcode";

/** Token unguessable — sert de seule autorisation au check-in par QR (`/api/qr/[token]`), pas
 * de session requise pour scanner : voir `src/app/api/qr/[token]/route.ts`. */
export function generateQrToken(): string {
  return randomBytes(18).toString("base64url");
}

export function getCheckInUrl(token: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}/api/qr/${token}`;
}

/** Data URL PNG, directement utilisable dans un `<img src>` — pas de dépendance réseau externe. */
export async function generateQrCodeDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(getCheckInUrl(token), { width: 320, margin: 2 });
}
