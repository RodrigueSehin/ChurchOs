import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Chiffrement des jetons d'accès des réseaux sociaux (AES-256-GCM). La clé (`SOCIAL_TOKEN_KEY`) est
 * une valeur de 32 octets en base64 (`openssl rand -base64 32`), propre à l'environnement : sans elle,
 * aucun jeton ne peut être enregistré — on ne stocke jamais un jeton en clair.
 */
function getKey(): Buffer {
  const raw = process.env.SOCIAL_TOKEN_KEY;
  if (!raw) throw new Error("SOCIAL_TOKEN_KEY n'est pas configurée (32 octets en base64 : openssl rand -base64 32).");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("SOCIAL_TOKEN_KEY doit faire 32 octets (base64).");
  return key;
}

export function isSocialCryptoConfigured() {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

/** Format : `v1.<iv>.<tag>.<données>` (base64url). */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptToken(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Jeton chiffré invalide.");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
