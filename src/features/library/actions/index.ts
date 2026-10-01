"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { libraryResources } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import {
  COVER_MAX_BYTES,
  COVER_MIME_EXTENSIONS,
  LIBRARY_BUCKET,
  LIBRARY_COVER_BUCKET,
  RESOURCE_MAX_BYTES,
  RESOURCE_MIME_TYPES,
  libraryCategorySchema,
  resourceSchema,
} from "@/features/library/schemas";

export interface LibraryActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

function canManageLibrary(check: Awaited<ReturnType<typeof checkPermission>>) {
  return check.context.isAdmin || check.context.permissions.has("training.manage");
}

/** Enregistre une ressource dont le fichier (jusqu'à 100 Mo) a déjà été envoyé DIRECTEMENT du
 * navigateur vers Storage — une Server Action ne peut pas porter un tel corps de requête. Le chemin
 * (organisation de l'appelant) est revérifié ici ; fichier et couverture sont retirés si
 * l'enregistrement échoue. */
export async function registerResource(input: {
  filePath: string;
  fileName: string;
  fileMime: string;
  fileSize: number;
  fields: Record<string, string>;
  /** Couverture déjà envoyée directement du navigateur (même raison que le fichier : 5 Mo > limite Vercel). */
  coverPath?: string;
  coverMime?: string;
  coverSize?: number;
}): Promise<LibraryActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission d'ajouter une ressource." };

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const coverPath = input.coverPath ?? null;
  const discard = async () => {
    await supabase.storage.from(LIBRARY_BUCKET).remove([input.filePath]);
    if (coverPath) await supabase.storage.from(LIBRARY_COVER_BUCKET).remove([coverPath]);
  };

  if (!input.filePath.startsWith(`${organizationId}/`) || input.filePath.includes("..")) {
    return { error: "Chemin de fichier invalide." };
  }
  if (!RESOURCE_MIME_TYPES.includes(input.fileMime)) {
    await discard();
    return { error: "Type de fichier non autorisé (PDF, DOC, DOCX, PPT, PPTX, MP4, MP3, JPG, PNG)." };
  }
  if (!(input.fileSize > 0) || input.fileSize > RESOURCE_MAX_BYTES) {
    await discard();
    return { error: "Fichier trop volumineux (100 Mo maximum)." };
  }

  const parsed = resourceSchema.safeParse(input.fields);
  if (!parsed.success) {
    await discard();
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const v = parsed.data;

  const { data: category } = await supabase
    .from("library_categories")
    .select("id")
    .eq("id", v.categoryId)
    .eq("organization_id", organizationId)
    .single();
  if (!category) {
    await discard();
    return { error: "Catégorie introuvable." };
  }

  let coverUrl: string | null = null;
  if (coverPath) {
    if (!coverPath.startsWith(`${organizationId}/`) || coverPath.includes("..")) {
      await discard();
      return { error: "Chemin d'image invalide." };
    }
    if (!COVER_MIME_EXTENSIONS[input.coverMime ?? ""] || !((input.coverSize ?? 0) > 0) || (input.coverSize ?? 0) > COVER_MAX_BYTES) {
      await discard();
      return { error: "Image de couverture : JPG, PNG ou WebP, 5 Mo maximum." };
    }
    coverUrl = supabase.storage.from(LIBRARY_COVER_BUCKET).getPublicUrl(coverPath).data.publicUrl;
  }

  const tags = v.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  const { error } = await supabase.from("library_resources").insert({
    organization_id: organizationId,
    category_id: v.categoryId,
    title: v.title,
    resource_type: v.resourceType,
    author: orNull(v.author),
    published_on: orNull(v.publishedOn),
    publisher: orNull(v.publisher),
    description: v.description,
    file_path: input.filePath,
    file_name: input.fileName,
    file_mime: input.fileMime,
    file_size: input.fileSize,
    cover_url: coverUrl,
    visibility: v.visibility,
    status: v.status,
    tags,
    created_by: check.user.id,
  });
  if (error) {
    await discard();
    return { error: error.message };
  }

  revalidatePath("/library");
  return { success: true };
}

/** Ouvre ou télécharge : renvoie une URL signée (5 min) et incrémente le compteur. La visibilité est
 * revérifiée ici en plus de la policy RLS du bucket. */
export async function accessResource(resourceId: string, mode: "view" | "download"): Promise<{ url?: string; error?: string }> {
  const check = await checkPermission("training.view");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de consulter cette ressource." };

  const organizationId = check.organization.organization.id;
  const [resource] = await db
    .select()
    .from(libraryResources)
    .where(and(eq(libraryResources.id, resourceId), eq(libraryResources.organizationId, organizationId)));
  if (!resource) return { error: "Ressource introuvable." };
  if (!canManageLibrary(check) && (resource.status !== "published" || resource.visibility !== "members")) {
    return { error: "Cette ressource n'est pas accessible." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrl(resource.filePath, 300, mode === "download" ? { download: resource.fileName ?? true } : undefined);
  if (error || !data) return { error: error?.message ?? "Échec de la génération du lien." };

  await db
    .update(libraryResources)
    .set(mode === "download" ? { downloadCount: sql`${libraryResources.downloadCount} + 1` } : { viewCount: sql`${libraryResources.viewCount} + 1` })
    .where(eq(libraryResources.id, resourceId));

  return { url: data.signedUrl };
}

export async function toggleBookmark(resourceId: string): Promise<{ bookmarked?: boolean; error?: string }> {
  const check = await checkPermission("training.view");
  if (!check.allowed) return { error: "Action non autorisée." };

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("library_bookmarks")
    .select("resource_id")
    .eq("resource_id", resourceId)
    .eq("user_id", check.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("library_bookmarks").delete().eq("resource_id", resourceId).eq("user_id", check.user.id);
    if (error) return { error: error.message };
    revalidatePath("/library");
    return { bookmarked: false };
  }
  const { error } = await supabase
    .from("library_bookmarks")
    .insert({ resource_id: resourceId, user_id: check.user.id, organization_id: organizationId });
  if (error) return { error: error.message };
  revalidatePath("/library");
  return { bookmarked: true };
}

export async function rateResource(resourceId: string, rating: number): Promise<LibraryActionState> {
  const check = await checkPermission("training.view");
  if (!check.allowed) return { error: "Action non autorisée." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Note invalide (1 à 5)." };

  const supabase = await createClient();
  const { error } = await supabase.from("library_ratings").upsert(
    {
      resource_id: resourceId,
      user_id: check.user.id,
      organization_id: check.organization.organization.id,
      rating,
    },
    { onConflict: "resource_id,user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/library");
  return { success: true };
}

/** Réservé aux gestionnaires de formation ; supprime aussi le fichier et la couverture. */
export async function deleteResource(resourceId: string): Promise<LibraryActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de supprimer cette ressource." };

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("library_resources")
    .select("file_path, cover_url")
    .eq("id", resourceId)
    .eq("organization_id", organizationId)
    .single();
  if (!resource) return { error: "Ressource introuvable." };

  const { error } = await supabase.from("library_resources").delete().eq("id", resourceId).eq("organization_id", organizationId);
  if (error) return { error: error.message };

  await supabase.storage.from(LIBRARY_BUCKET).remove([resource.file_path]);
  const marker = `/object/public/${LIBRARY_COVER_BUCKET}/`;
  const i = resource.cover_url?.indexOf(marker) ?? -1;
  if (resource.cover_url && i >= 0) {
    await supabase.storage.from(LIBRARY_COVER_BUCKET).remove([decodeURIComponent(resource.cover_url.slice(i + marker.length))]);
  }

  revalidatePath("/library");
  return { success: true };
}

export async function createLibraryCategory(_prev: LibraryActionState, formData: FormData): Promise<LibraryActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les catégories." };

  const parsed = libraryCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_categories")
    .insert({ organization_id: check.organization.organization.id, name: parsed.data.name });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) return { error: "Une catégorie avec ce nom existe déjà." };
    return { error: error.message };
  }
  revalidatePath("/library");
  return { success: true };
}

/** Les ressources de la catégorie supprimée restent (sans catégorie). */
export async function deleteLibraryCategory(categoryId: string): Promise<LibraryActionState> {
  const check = await checkPermission("training.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de gérer les catégories." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_categories")
    .delete()
    .eq("id", categoryId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };
  revalidatePath("/library");
  return { success: true };
}
