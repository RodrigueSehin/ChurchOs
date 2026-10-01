import "server-only";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { announcements, mediaItems, mediaYoutubeChannels } from "@/lib/db/schema";
import { isYoutubeConfigured, listChannelVideos } from "@/lib/youtube/api";
import { MEDIA_BUCKET, type MediaEntry, type MediaKind } from "@/features/media/schemas";

export const MEDIA_PAGE_SIZE = 12;

export type YoutubeStatus =
  | { state: "no-key" }
  | { state: "no-channel" }
  | { state: "error"; channelTitle: string; message: string }
  | { state: "ok"; channelTitle: string; channelHandle: string | null; total: number | null };

function publicUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Toute la médiathèque d'une église : fichiers téléversés, images/documents des annonces, et vidéos de sa chaîne YouTube. */
export async function loadMedia(organizationId: string): Promise<{ entries: MediaEntry[]; youtube: YoutubeStatus; storageBytes: number }> {
  const [uploads, announcementRows, [channel]] = await Promise.all([
    db.select().from(mediaItems).where(eq(mediaItems.organizationId, organizationId)).orderBy(desc(mediaItems.createdAt)),
    db
      .select()
      .from(announcements)
      .where(and(eq(announcements.organizationId, organizationId), or(isNotNull(announcements.imageUrl), isNotNull(announcements.attachmentUrl)))),
    db.select().from(mediaYoutubeChannels).where(eq(mediaYoutubeChannels.organizationId, organizationId)),
  ]);

  const entries: MediaEntry[] = [];
  for (const u of uploads) {
    const url = publicUrl(u.filePath);
    entries.push({
      key: `upload-${u.id}`,
      source: "upload",
      kind: u.kind as MediaKind,
      title: u.title,
      date: u.createdAt.toISOString(),
      url,
      thumbnail: u.kind === "photo" ? url : null,
      sizeBytes: u.sizeBytes,
      width: u.width,
      height: u.height,
      mime: u.mimeType,
      fileName: u.fileName,
      durationSeconds: null,
      views: null,
      tags: u.tags,
      uploadId: u.id,
      youtubeId: null,
      note: null,
    });
  }

  for (const a of announcementRows) {
    const date = (a.publishAt ?? a.createdAt).toISOString();
    const base = { source: "announcement" as const, date, sizeBytes: null, width: null, height: null, durationSeconds: null, views: null, tags: [], uploadId: null, youtubeId: null, note: `Annonce : ${a.title}` };
    if (a.imageUrl) {
      entries.push({ ...base, key: `ann-${a.id}-image`, kind: "photo", title: a.title, url: a.imageUrl, thumbnail: a.imageUrl, mime: null, fileName: null });
    }
    // Les vidéos d'une annonce ne sont pas listées : les vidéos de la page viennent de la chaîne YouTube.
    if (a.attachmentUrl && a.attachmentType !== "video") {
      entries.push({ ...base, key: `ann-${a.id}-file`, kind: "document", title: a.attachmentName ?? a.title, url: a.attachmentUrl, thumbnail: null, mime: null, fileName: a.attachmentName });
    }
  }

  let youtube: YoutubeStatus;
  if (!isYoutubeConfigured()) youtube = { state: "no-key" };
  else if (!channel) youtube = { state: "no-channel" };
  else {
    try {
      const { videos, total } = await listChannelVideos(channel.uploadsPlaylistId);
      for (const v of videos) {
        entries.push({
          key: `yt-${v.id}`,
          source: "youtube",
          kind: "video",
          title: v.title,
          date: v.publishedAt.toISOString(),
          url: `https://www.youtube.com/watch?v=${v.id}`,
          thumbnail: v.thumbnail,
          sizeBytes: null,
          width: null,
          height: null,
          mime: null,
          fileName: null,
          durationSeconds: v.durationSeconds,
          views: v.views,
          tags: [],
          uploadId: null,
          youtubeId: v.id,
          note: `Chaîne YouTube : ${channel.channelTitle}`,
        });
      }
      youtube = { state: "ok", channelTitle: channel.channelTitle, channelHandle: channel.channelHandle, total };
    } catch (error) {
      console.error("media: échec de lecture de la chaîne YouTube —", error instanceof Error ? error.message : error);
      youtube = { state: "error", channelTitle: channel.channelTitle, message: error instanceof Error ? error.message : "Erreur YouTube" };
    }
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));
  const [storage] = await db
    .select({ value: sql<number>`coalesce(sum(${mediaItems.sizeBytes}), 0)::float8` })
    .from(mediaItems)
    .where(eq(mediaItems.organizationId, organizationId));
  return { entries, youtube, storageBytes: storage?.value ?? 0 };
}

export function summarize(entries: MediaEntry[], youtube: YoutubeStatus) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const startIso = monthStart.toISOString();

  const kinds: MediaKind[] = ["photo", "video", "audio", "document"];
  const stats = {} as Record<MediaKind, { count: number; growthPct: number | null }>;
  for (const kind of kinds) {
    const list = entries.filter((e) => e.kind === kind);
    const recent = list.filter((e) => e.date >= startIso).length;
    const before = list.length - recent;
    stats[kind] = { count: list.length, growthPct: before > 0 ? Math.round((recent / before) * 100) : null };
  }
  // Le total de la chaîne (statistiques YouTube) peut dépasser les 150 dernières vidéos chargées.
  if (youtube.state === "ok" && youtube.total !== null) stats.video.count = Math.max(stats.video.count, youtube.total);
  return stats;
}
