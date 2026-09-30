"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getAttachmentLinks, type AttachmentLink } from "@/features/finance/actions";

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** Liste les justificatifs d'une opération ; les liens sont des URL signées de 60 s, générées à
 * l'ouverture (jamais d'URL publique permanente vers le bucket privé). */
export function TransactionAttachmentsDialog({
  transactionId,
  label,
  open,
  onOpenChange,
}: {
  transactionId: string;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [links, setLinks] = useState<AttachmentLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getAttachmentLinks(transactionId).then((res) => {
      if (cancelled) return;
      if (res.error) setError(res.error);
      else setLinks(res.links ?? []);
    });
    return () => {
      cancelled = true;
      setLinks(null);
      setError(null);
    };
  }, [open, transactionId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pièces jointes</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-danger">{error}</p>}
        {!error && links === null && <p className="text-sm text-slate-500">Chargement...</p>}
        {links && links.length === 0 && <p className="text-sm text-slate-500">Aucune pièce jointe.</p>}
        {links && links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {links.map((l) => (
              <li key={l.id}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                >
                  <FileText className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy">{l.fileName}</span>
                  <span className="shrink-0 text-xs text-slate-400">{formatSize(l.sizeBytes)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
