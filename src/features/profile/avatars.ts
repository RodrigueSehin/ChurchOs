/** Avatars prédéfinis : fichiers statiques de `public/avatars/` (aucun stockage, aucune requête
 * externe). `profiles.avatar_url` en contient le chemin ; un avatar personnalisé y est à la place
 * une URL publique du bucket `churchos-avatars`. */
export const AVATAR_PRESETS = Array.from({ length: 12 }, (_, i) => `/avatars/avatar-${String(i + 1).padStart(2, "0")}.svg`);

export function isPresetAvatar(url: string | null | undefined): url is string {
  return Boolean(url) && AVATAR_PRESETS.includes(url as string);
}

export const AVATAR_BUCKET = "churchos-avatars";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
