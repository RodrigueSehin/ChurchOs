import "server-only";

/**
 * Publication via la Graph API de Meta (Facebook Page, Instagram Business). Les comptes sont connectés
 * manuellement (identifiant + jeton d'accès longue durée de la Page, saisis dans Paramètres > Réseaux
 * sociaux) : aucune application OAuth n'est requise. Chaque fonction lève une `Error` au message
 * lisible (celui renvoyé par Meta) — l'appelant l'enregistre par compte, sans annuler l'annonce.
 */
const GRAPH = "https://graph.facebook.com/v21.0";

async function graph<T>(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST"): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`);
  const init: RequestInit = { method };
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    init.body = new URLSearchParams(params);
  }
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json || json.error) {
    throw new Error(json?.error?.message ?? `Erreur ${res.status} de l'API Meta.`);
  }
  return json;
}

/** Vérifie un couple identifiant / jeton et renvoie le nom affichable du compte. */
export async function verifyConnection(provider: "facebook" | "instagram", externalId: string, token: string) {
  const fields = provider === "facebook" ? "name" : "username";
  const data = await graph<{ name?: string; username?: string }>(externalId, { fields, access_token: token }, "GET");
  return data.name ?? data.username ?? externalId;
}

/** Publication (ou programmation native, `scheduledAt` entre 10 min et 30 jours) sur une Page Facebook. */
export async function publishToFacebook(input: {
  pageId: string;
  token: string;
  message: string;
  imageUrl?: string | null;
  scheduledAt?: Date | null;
}) {
  const params: Record<string, string> = { access_token: input.token };
  if (input.scheduledAt) {
    params.published = "false";
    params.scheduled_publish_time = String(Math.floor(input.scheduledAt.getTime() / 1000));
  }
  if (input.imageUrl) {
    const res = await graph<{ id: string; post_id?: string }>(`${input.pageId}/photos`, { ...params, url: input.imageUrl, caption: input.message });
    return { id: res.post_id ?? res.id, scheduled: Boolean(input.scheduledAt) };
  }
  const res = await graph<{ id: string }>(`${input.pageId}/feed`, { ...params, message: input.message });
  return { id: res.id, scheduled: Boolean(input.scheduledAt) };
}

/** Publication Instagram (compte Business) : une image publique est obligatoire ; pas de programmation via l'API. */
export async function publishToInstagram(input: { igUserId: string; token: string; caption: string; imageUrl: string }) {
  const container = await graph<{ id: string }>(`${input.igUserId}/media`, {
    image_url: input.imageUrl,
    caption: input.caption,
    access_token: input.token,
  });
  const published = await graph<{ id: string }>(`${input.igUserId}/media_publish`, {
    creation_id: container.id,
    access_token: input.token,
  });
  return { id: published.id, scheduled: false };
}
