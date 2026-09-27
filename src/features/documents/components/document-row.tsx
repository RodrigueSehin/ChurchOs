"use client";

import { useState, useTransition } from "react";
import { Download, File, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteDocument, getDocumentDownloadUrl } from "@/features/documents/actions";
import { DOCUMENT_VISIBILITY_LABELS } from "@/features/documents/schemas";
import type { documents } from "@/lib/db/schema";

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function DocumentRow({
  document,
  canDelete,
}: {
  document: typeof documents.$inferSelect;
  canDelete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDownload() {
    startTransition(async () => {
      const res = await getDocumentDownloadUrl(document.id);
      if (res.error) setError(res.error);
      else if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteDocument(document.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
      <div className="flex min-w-0 items-center gap-2">
        <File className="size-4 shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-navy">{document.name}</p>
          <p className="text-xs text-slate-400">
            {formatSize(document.sizeBytes)}
            {document.visibility === "private" && (
              <>
                {" · "}
                <Badge variant="secondary" className="text-[10px]">
                  {DOCUMENT_VISIBILITY_LABELS[document.visibility]}
                </Badge>
              </>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {error && <span className="text-xs text-danger">{error}</span>}
        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleDownload}>
          <Download className="size-4" />
        </Button>
        {canDelete && (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
                <Trash2 className="size-4" />
              </Button>
            }
            title="Supprimer ce document ?"
            description={`"${document.name}" sera définitivement supprimé (fichier et référence).`}
            confirmLabel="Supprimer"
            variant="destructive"
            onConfirm={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
