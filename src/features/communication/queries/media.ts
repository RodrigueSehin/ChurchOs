import "server-only";
import { desc, eq, or, isNotNull, and } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";

export interface MediaItem {
  key: string;
  kind: "image" | "video" | "document";
  url: string;
  name: string;
  announcementId: string;
  announcementTitle: string;
  date: Date;
}

/** Médias (images, vidéos, documents) joints aux annonces de l'église. */
export async function getMediaItems(organizationId: string): Promise<MediaItem[]> {
  const rows = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.organizationId, organizationId), or(isNotNull(announcements.imageUrl), isNotNull(announcements.attachmentUrl))))
    .orderBy(desc(announcements.createdAt));

  const items: MediaItem[] = [];
  for (const a of rows) {
    const date = a.publishAt ?? a.createdAt;
    if (a.imageUrl) items.push({ key: `${a.id}-image`, kind: "image", url: a.imageUrl, name: a.title, announcementId: a.id, announcementTitle: a.title, date });
    if (a.attachmentUrl) {
      items.push({
        key: `${a.id}-file`,
        kind: a.attachmentType === "video" ? "video" : "document",
        url: a.attachmentUrl,
        name: a.attachmentName ?? "Pièce jointe",
        announcementId: a.id,
        announcementTitle: a.title,
        date,
      });
    }
  }
  return items;
}
