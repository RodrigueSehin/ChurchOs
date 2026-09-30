"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, MoreHorizontal, Paperclip, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteTransaction, updateTransactionStatus } from "@/features/finance/actions";
import { TransactionAttachmentsDialog } from "@/features/finance/components/transaction-attachments-dialog";

export function DonationRowActions({
  transactionId,
  label,
  type = "income",
  status,
  attachmentCount = 0,
  canApprove = false,
  canDelete = true,
}: {
  transactionId: string;
  label: string;
  type?: "income" | "expense";
  status?: string;
  attachmentCount?: number;
  canApprove?: boolean;
  canDelete?: boolean;
}) {
  const noun = type === "income" ? "don" : "dépense";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTransaction(transactionId, type);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleStatus(next: string) {
    startTransition(async () => {
      const res = await updateTransactionStatus(transactionId, next);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  const showStatus = canApprove && status !== undefined;
  const showAttachments = attachmentCount > 0;
  if (!showStatus && !showAttachments && !canDelete) return null;

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions" disabled={isPending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showAttachments && (
            <DropdownMenuItem onSelect={() => setAttachmentsOpen(true)}>
              <Paperclip className="size-4" />
              Pièces jointes ({attachmentCount})
            </DropdownMenuItem>
          )}
          {showStatus && (
            <>
              {showAttachments && <DropdownMenuSeparator />}
              {status !== "validated" && (
                <DropdownMenuItem onSelect={() => handleStatus("validated")}>
                  <CheckCircle2 className="size-4" />
                  Valider
                </DropdownMenuItem>
              )}
              {status !== "pending" && (
                <DropdownMenuItem onSelect={() => handleStatus("pending")}>
                  <Clock className="size-4" />
                  Mettre en attente
                </DropdownMenuItem>
              )}
              {status !== "rejected" && (
                <DropdownMenuItem onSelect={() => handleStatus("rejected")} className="text-danger">
                  <XCircle className="size-4" />
                  Rejeter
                </DropdownMenuItem>
              )}
            </>
          )}
          {canDelete && (
            <>
              {(showAttachments || showStatus) && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
                <Trash2 className="size-4" />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showAttachments && (
        <TransactionAttachmentsDialog transactionId={transactionId} label={label} open={attachmentsOpen} onOpenChange={setAttachmentsOpen} />
      )}

      {canDelete && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Supprimer ${type === "income" ? "ce don" : "cette dépense"} ?`}
          description={`${type === "income" ? "Le" : "La"} ${noun} « ${label} » sera définitivement ${type === "income" ? "supprimé" : "supprimée"}.`}
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
