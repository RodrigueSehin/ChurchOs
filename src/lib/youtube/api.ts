import "server-only";

const API = "https://www.googleapis.com/youtube/v3";

export function isYoutubeConfigured() {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

export interface YoutubeChannel {
  channelId: string;
  title: string;
  handle: string | null;
  uploadsPlaylistId: string;
}

export interface YoutubeVideo {
  id: string;
  title: string;
  publishedAt: Date;
  thumbnail: string | null;
  durationSeconds: number;
  views: number;
}

class YoutubeError extends Error {}

async function call<T>(path: string, params: Record<string, string>, revalidate = 900): Promise<T> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YoutubeError("YOUTUBE_API_KEY n'est pas configurée.");
  const url = `${API}/${path}?${new URLSearchParams({ ...params, key })}`;
  const res = await fetch(url, { next: { revalidate } });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new YoutubeError(json.error?.message ?? `Erreur YouTube (${res.status}).`);
  return json;
}

interface ChannelsResponse {
  items?: { id: string; snippet: { title: string; customUrl?: string }; contentDetails: { relatedPlaylists: { uploads: string } } }[];
}

/** Résout une URL de chaîne (`/channel/UC…`, `/@nom`, `/c/nom`), un `@nom` ou un identifiant `UC…`. */
export async function resolveChannel(input: string): Promise<YoutubeChannel> {
  const raw = input.trim();
  if (!raw) throw new YoutubeError("Saisissez l'URL ou l'identifiant de la chaîne.");

  let id: string | null = null;
  let handle: string | null = null;
  let name: string | null = null;

  if (/^UC[\w-]{22}$/.test(raw)) id = raw;
  else if (raw.startsWith("@")) handle = raw;
  else {
    let url: URL;
    try {
      url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    } catch {
      throw new YoutubeError("URL de chaîne invalide.");
    }
    if (!/(^|\.)youtube\.com$/i.test(url.hostname)) throw new YoutubeError("L'URL doit être celle d'une chaîne YouTube.");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) id = parts[1];
    else if (parts[0]?.startsWith("@")) handle = parts[0];
    else if ((parts[0] === "c" || parts[0] === "user") && parts[1]) name = parts[1];
    else throw new YoutubeError("URL de chaîne non reconnue (utilisez youtube.com/@nom ou youtube.com/channel/…).");
  }

  const base = { part: "snippet,contentDetails" };
  let data: ChannelsResponse;
  if (id) data = await call<ChannelsResponse>("channels", { ...base, id }, 0);
  else if (handle) data = await call<ChannelsResponse>("channels", { ...base, forHandle: handle }, 0);
  else {
    data = await call<ChannelsResponse>("channels", { ...base, forUsername: name! }, 0);
    if (!data.items?.length) {
      const found = await call<{ items?: { id: { channelId: string } }[] }>("search", { part: "snippet", type: "channel", q: name!, maxResults: "1" }, 0);
      const channelId = found.items?.[0]?.id.channelId;
      if (channelId) data = await call<ChannelsResponse>("channels", { ...base, id: channelId }, 0);
    }
  }

  const item = data.items?.[0];
  if (!item) throw new YoutubeError("Chaîne YouTube introuvable.");
  return {
    channelId: item.id,
    title: item.snippet.title,
    handle: item.snippet.customUrl ?? handle,
    uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
  };
}

function parseDuration(iso: string) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3] ?? 0) * 60 + Number(m[4] ?? 0);
}

/** Dernières vidéos publiques de la chaîne (jusqu'à `max`, 50 par appel), du plus récent au plus ancien. */
export async function listChannelVideos(uploadsPlaylistId: string, max = 150): Promise<{ videos: YoutubeVideo[]; total: number | null }> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let total: number | null = null;
  while (ids.length < max) {
    const page: {
      items?: { contentDetails: { videoId: string } }[];
      nextPageToken?: string;
      pageInfo?: { totalResults?: number };
    } = await call("playlistItems", { part: "contentDetails", playlistId: uploadsPlaylistId, maxResults: "50", ...(pageToken ? { pageToken } : {}) });
    total = page.pageInfo?.totalResults ?? total;
    for (const it of page.items ?? []) ids.push(it.contentDetails.videoId);
    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }

  const videos: YoutubeVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    const data = await call<{
      items?: {
        id: string;
        snippet: { title: string; publishedAt: string; thumbnails?: Record<string, { url: string }> };
        contentDetails: { duration: string };
        statistics?: { viewCount?: string };
      }[];
    }>("videos", { part: "snippet,contentDetails,statistics", id: batch.join(",") });
    // `videos.list` omet les vidéos privées / supprimées que la playlist « uploads » peut encore citer.
    for (const v of data.items ?? []) {
      const t = v.snippet.thumbnails;
      videos.push({
        id: v.id,
        title: v.snippet.title,
        publishedAt: new Date(v.snippet.publishedAt),
        thumbnail: (t?.high ?? t?.medium ?? t?.default)?.url ?? null,
        durationSeconds: parseDuration(v.contentDetails.duration),
        views: Number(v.statistics?.viewCount ?? 0),
      });
    }
  }
  videos.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return { videos, total };
}
