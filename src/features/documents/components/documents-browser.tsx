import Link from "next/link";
import { Folder } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { DOCUMENT_VISIBILITY_LABELS } from "@/features/documents/schemas";
import { DeleteFolderButton } from "@/features/documents/components/delete-folder-button";
import { DocumentRow } from "@/features/documents/components/document-row";
import type { getFolderContents } from "@/features/documents/queries";

type Contents = Awaited<ReturnType<typeof getFolderContents>>;

export function DocumentsBrowser({
  contents,
  canManage,
  isAdmin,
}: {
  contents: Contents;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const { folders, documents } = contents;

  if (folders.length === 0 && documents.length === 0) {
    return <EmptyState icon={Folder} title="Dossier vide" description="Créez un sous-dossier ou téléversez un document." className="border-0" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {folders.map((folder) => (
        <div key={folder.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <Link href={`/documents?folderId=${folder.id}`} className="flex min-w-0 items-center gap-2">
            <Folder className="size-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium text-navy hover:underline">{folder.name}</span>
            {folder.visibility === "private" && (
              <Badge variant="secondary" className="text-[10px]">
                {DOCUMENT_VISIBILITY_LABELS[folder.visibility]}
              </Badge>
            )}
          </Link>
          {isAdmin && <DeleteFolderButton folderId={folder.id} folderName={folder.name} />}
        </div>
      ))}
      {documents.map((document) => (
        <DocumentRow key={document.id} document={document} canDelete={canManage && isAdmin} />
      ))}
    </div>
  );
}
