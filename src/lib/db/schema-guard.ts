import "server-only";

/**
 * Reconnaît une erreur Postgres « colonne / table inexistante » (42703 / 42P01) — le symptôme d'une
 * migration SQL pas encore appliquée à la base. Le pilote enveloppe l'erreur d'origine (`cause`) : on
 * remonte la chaîne.
 */
export function isSchemaMismatch(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    const e = current as { code?: string; message?: string; cause?: unknown };
    if (e.code === "42703" || e.code === "42P01") return true;
    if (typeof e.message === "string" && /(column|relation) .* does not exist/i.test(e.message)) return true;
    current = e.cause;
  }
  return false;
}

/**
 * Exécute un chargement de page ; si la base n'a pas la migration attendue, renvoie `{ ok: false }` au
 * lieu de laisser la page planter avec l'erreur React #441 (message masqué en production). Toute autre
 * erreur est relancée telle quelle.
 */
export async function guardSchema<T>(load: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false }> {
  try {
    return { ok: true, data: await load() };
  } catch (error) {
    if (isSchemaMismatch(error)) {
      console.error("schema-guard: migration SQL manquante —", error instanceof Error ? error.message : error);
      return { ok: false };
    }
    throw error;
  }
}
