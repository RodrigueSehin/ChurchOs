"use server";

import { revalidatePath } from "next/cache";

import { checkPermission } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, documentUploadSchema, folderSchema } from "@/features/documents/schemas";

const STORAGE_BUCKET = "churchos-documents";

export interface DocumentActionState {
  error?: string;
  success?: boolean;
}

function orNull(value: string) {
  return value.trim() === "" ? null : value.trim();
}

export async function createFolder(_prev: DocumentActionState, formData: FormData): Promise<DocumentActionState> {
  const check = await checkPermission("documents.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de créer un dossier." };

  const parsed = folderSchema.safeParse({
    name: formData.get("name"),
    parentId: formData.get("parentId"),
    visibility: formData.get("visibility"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("document_folders").insert({
    organization_id: check.organization.organization.id,
    parent_id: orNull(v.parentId),
    name: v.name,
    visibility: v.visibility,
    created_by: check.user.id,
  });
  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      return { error: "Un dossier avec ce nom existe déjà ici." };
    }
    return { error: error.message };
  }

  revalidatePath("/documents");
  return { success: true };
}

/** Réservé aux admins (policy RLS de suppression : `is_org_admin()`) — même contrainte que les
 * autres modules. Les sous-dossiers sont supprimés en cascade (FK `parent_id`), leurs documents
 * (comme ceux de ce dossier) remontent à la racine (`folder_id` en `set null`, pas de cascade). */
export async function deleteFolder(folderId: string): Promise<DocumentActionState> {
  const check = await checkPermission("documents.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un dossier." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("document_folders")
    .delete()
    .eq("id", folderId)
    .eq("organization_id", check.organization.organization.id);
  if (error) return { error: error.message };

  revalidatePath("/documents");
  return { success: true };
}

/** Enregistre en base un document dont le fichier a déjà été envoyé DIRECTEMENT du navigateur vers
 * Supabase Storage (`<organization_id>/<uuid>-<nom>` dans le bucket privé). Le fichier ne passe
 * pas par cette Server Action : sur Vercel, le corps d'une requête serverless est limité à
 * ~4,5 Mo, ce qui faisait échouer tout téléversement un peu volumineux ("This page couldn't
 * load"). Le bucket applique lui-même la taille et les types MIME ; on revérifie ici le chemin
 * (organisation de l'appelant) et les métadonnées, et on retire l'objet si l'enregistrement échoue. */
export async function registerDocument(input: {
  path: string;
  name: string;
  folderId: string;
  visibility: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<DocumentActionState> {
  const check = await checkPermission("documents.manage");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de téléverser un document." };

  const organizationId = check.organization.organization.id;
  const supabase = await createClient();
  const discard = () => supabase.storage.from(STORAGE_BUCKET).remove([input.path]);

  if (!input.path.startsWith(`${organizationId}/`) || input.path.includes("..")) {
    return { error: "Chemin de fichier invalide." };
  }
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    await discard();
    return { error: "Type de fichier non autorisé (PDF, Word, Excel, PowerPoint, texte, CSV ou image uniquement)." };
  }
  if (!(input.sizeBytes > 0) || input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    await discard();
    return { error: "Fichier trop volumineux (25 Mo maximum)." };
  }

  const parsed = documentUploadSchema.safeParse({
    name: input.name,
    folderId: input.folderId,
    visibility: input.visibility,
  });
  if (!parsed.success) {
    await discard();
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const v = parsed.data;

  const { error: dbError } = await supabase.from("documents").insert({
    organization_id: organizationId,
    folder_id: orNull(v.folderId),
    name: orNull(v.name) ?? input.path.split("/").pop()!.replace(/^[0-9a-f-]{36}-/, ""),
    storage_bucket: STORAGE_BUCKET,
    storage_path: input.path,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    visibility: v.visibility,
    uploaded_by: check.user.id,
  });
  if (dbError) {
    // Un objet Storage sans ligne `documents` est invisible dans l'app : on le retire.
    await discard();
    return { error: dbError.message };
  }

  revalidatePath("/documents");
  return { success: true };
}

/** Réservé aux admins — même contrainte que la suppression d'un dossier. Supprime l'objet
 * Storage avant la ligne `documents` : si la suppression Storage échoue, on garde la ligne DB
 * plutôt que de laisser une entrée qui pointe vers un fichier déjà supprimé. */
export async function deleteDocument(documentId: string): Promise<DocumentActionState> {
  const check = await checkPermission("documents.manage");
  if (!check.allowed || !check.context.isAdmin) {
    return { error: "Seul un administrateur de l'organisation peut supprimer un document." };
  }

  const organizationId = check.organization.organization.id;
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc || doc.organizationId !== organizationId) return { error: "Document introuvable." };

  const supabase = await createClient();
  const { error: storageError } = await supabase.storage.from(doc.storageBucket).remove([doc.storagePath]);
  if (storageError) return { error: `Échec de la suppression du fichier : ${storageError.message}` };

  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("organization_id", organizationId);
  if (dbError) return { error: dbError.message };

  revalidatePath("/documents");
  return { success: true };
}

/** Génère une URL signée de courte durée (le bucket est privé — voir db/schema.sql §23) pour un
 * téléchargement direct côté client. `createSignedUrl` est exécuté avec le client authentifié de
 * l'utilisateur : la policy RLS `documents_storage_select_org` sur `storage.objects` s'applique
 * donc réellement, pas seulement l'appartenance déjà vérifiée par `checkPermission`. */
export async function getDocumentDownloadUrl(documentId: string): Promise<{ url?: string; error?: string }> {
  const check = await checkPermission("documents.view");
  if (!check.allowed) return { error: "Vous n'avez pas la permission de voir ce document." };

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc || doc.organizationId !== check.organization.organization.id) {
    return { error: "Document introuvable." };
  }
  if (doc.visibility === "private" && doc.uploadedBy !== check.user.id && !check.context.isAdmin) {
    return { error: "Ce document est privé." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(doc.storageBucket).createSignedUrl(doc.storagePath, 300);
  if (error || !data) return { error: error?.message ?? "Échec de la génération du lien." };

  return { url: data.signedUrl };
}
