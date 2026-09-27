import "server-only";
import { and, asc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { documentFolders, documents } from "@/lib/db/schema";

export async function getFolder(organizationId: string, folderId: string) {
  const [folder] = await db
    .select()
    .from(documentFolders)
    .where(and(eq(documentFolders.id, folderId), eq(documentFolders.organizationId, organizationId)));
  return folder ?? null;
}

/**
 * Filtre de visibilité applicatif — nécessaire même si RLS protège déjà `storage.objects` et les
 * tables `public.*` par organisation : RLS ne connaît que `is_org_member`, jamais la colonne
 * `visibility` elle-même (comme documenté pour la confidentialité pastorale en Phase 6). Un
 * document/dossier `private` n'est visible que par son auteur ou un admin d'organisation.
 */
export async function getFolderContents({
  organizationId,
  folderId,
  userId,
  isAdmin,
}: {
  organizationId: string;
  folderId: string | null;
  userId: string;
  isAdmin: boolean;
}) {
  const folderCondition = folderId ? eq(documentFolders.parentId, folderId) : isNull(documentFolders.parentId);
  const folderVisibility = isAdmin
    ? undefined
    : or(eq(documentFolders.visibility, "organization"), eq(documentFolders.createdBy, userId));

  const folders = await db
    .select()
    .from(documentFolders)
    .where(and(eq(documentFolders.organizationId, organizationId), folderCondition, folderVisibility))
    .orderBy(asc(documentFolders.name));

  const documentCondition = folderId ? eq(documents.folderId, folderId) : isNull(documents.folderId);
  const docVisibility = isAdmin
    ? undefined
    : or(eq(documents.visibility, "organization"), eq(documents.uploadedBy, userId));

  const files = await db
    .select()
    .from(documents)
    .where(and(eq(documents.organizationId, organizationId), documentCondition, docVisibility))
    .orderBy(asc(documents.name));

  return { folders, documents: files };
}
