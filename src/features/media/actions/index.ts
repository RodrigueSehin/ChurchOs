"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { checkPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { mediaItems, mediaYoutubeChannels } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { resolveChannel } from "@/lib/youtube/api";
import { MEDIA_BUCKET, MEDIA_MAX_BYTES, UPLOAD_MIME_KINDS, normalizeTags } from "@/features/media/schemas";

export interface MediaActionState {
  error?: string;
  success?: boolean;
}

const PATH = "/communication/media";

const uploadedFileSchema = z.object({
  path: z.string().min(1),
  name: z.string().trim().min(1).max(255),
  mime: z.string(),
  size: z.number().int().positive().max(MEDIA_MAX_BYTES, "Fichier trop volumineux (100 Mo maximum)."),
  title: z.string().trim().min(1, "Titre requis").max(200),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

/** Enregistre des fichiers déjà envoyés DIRECTEMENT du navigateur vers Storage (une Server Action ne peut pas porter leur corps). */
export async function registerMedia(input: { files: z.input<typeof uploadedFileSchema>[]; tags?: string[] }): Promise<MediaActionState> {
  const check = await checkPermission("media.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'ajouter des médias." };
  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const discard = () => supabase.storage.from(MEDIA_BUCKET).remove(input.files.map((f) => f.path).filter((p) => p.startsWith(`${organizationId}/`) && !p.includes("..")));

  const parsed = z.array(uploadedFileSchema).min(1).max(20).safeParse(input.files);
  if (!parsed.success) {
    await discard();
    return { error: parsed.error.issues[0]?.message ?? "Fichier invalide." };
  }
  for (const f of parsed.data) {
    if (!f.path.startsWith(`${organizationId}/`) || f.path.includes("..")) {
      await discard();
      return { error: "Chemin de fichier invalide." };
    }
    if (!UPLOAD_MIME_KINDS[f.mime]) {
      await discard();
      return { error: `Type de fichier non autorisé : ${f.name} (photos, audios MP3/M4A/WAV/OGG, PDF, DOCX).` };
    }
  }

  const tags = normalizeTags(input.tags ?? []);
  try {
    await db.insert(mediaItems).values(
      parsed.data.map((f) => ({
        organizationId,
        kind: UPLOAD_MIME_KINDS[f.mime]!,
        title: f.title,
        filePath: f.path,
        fileName: f.name,
        mimeType: f.mime,
        sizeBytes: f.size,
        width: UPLOAD_MIME_KINDS[f.mime] === "photo" ? (f.width ?? null) : null,
        height: UPLOAD_MIME_KINDS[f.mime] === "photo" ? (f.height ?? null) : null,
        tags,
        createdBy: check.user.id,
      })),
    );
  } catch (error) {
    await discard();
    return { error: error instanceof Error ? error.message : "Échec de l'enregistrement." };
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function updateMedia(input: { id: string; title: string; tags: string[] }): Promise<MediaActionState> {
  const check = await checkPermission("media.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de modifier ce média." };
  const title = input.title.trim();
  if (!title || title.length > 200) return { error: "Titre requis (200 caractères maximum)." };
  const updated = await db
    .update(mediaItems)
    .set({ title, tags: normalizeTags(input.tags) })
    .where(and(eq(mediaItems.id, input.id), eq(mediaItems.organizationId, check.organization.organization.id)))
    .returning({ id: mediaItems.id });
  if (updated.length === 0) return { error: "Média introuvable." };
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteMedia(id: string): Promise<MediaActionState> {
  const check = await checkPermission("media.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de supprimer ce média." };
  const [row] = await db
    .delete(mediaItems)
    .where(and(eq(mediaItems.id, id), eq(mediaItems.organizationId, check.organization.organization.id)))
    .returning({ filePath: mediaItems.filePath });
  if (!row) return { error: "Média introuvable." };
  const supabase = await createClient();
  await supabase.storage.from(MEDIA_BUCKET).remove([row.filePath]);
  revalidatePath(PATH);
  return { success: true };
}

/** Relie la chaîne YouTube de l'église (administrateur) : ses vidéos alimentent l'onglet Vidéos. */
export async function saveYoutubeChannel(input: string): Promise<MediaActionState & { title?: string }> {
  const check = await checkPermission("media.manage");
  if (!check.allowed || !check.context.isAdmin) return { error: "Seul un administrateur peut relier la chaîne YouTube." };
  try {
    const channel = await resolveChannel(input);
    await db
      .insert(mediaYoutubeChannels)
      .values({
        organizationId: check.organization.organization.id,
        channelId: channel.channelId,
        channelTitle: channel.title,
        channelHandle: channel.handle,
        uploadsPlaylistId: channel.uploadsPlaylistId,
      })
      .onConflictDoUpdate({
        target: mediaYoutubeChannels.organizationId,
        set: { channelId: channel.channelId, channelTitle: channel.title, channelHandle: channel.handle, uploadsPlaylistId: channel.uploadsPlaylistId, updatedAt: new Date() },
      });
    revalidatePath(PATH);
    return { success: true, title: channel.title };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Échec de la connexion à YouTube." };
  }
}

export async function removeYoutubeChannel(): Promise<MediaActionState> {
  const check = await checkPermission("media.manage");
  if (!check.allowed || !check.context.isAdmin) return { error: "Seul un administrateur peut déconnecter la chaîne YouTube." };
  await db.delete(mediaYoutubeChannels).where(eq(mediaYoutubeChannels.organizationId, check.organization.organization.id));
  revalidatePath(PATH);
  return { success: true };
}
