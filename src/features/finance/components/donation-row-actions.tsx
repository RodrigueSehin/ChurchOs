"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteTransaction } from "@/features/finance/actions";

export function DonationRowActions({
  transactionId,
  label,
  type = "income",
}: {
  transactionId: string;
  label: string;
  type?: "income" | "expense";
}) {
  const noun = type === "income" ? "don" : "dépense";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTransaction(transactionId, type);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions" disabled={isPending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
            <Trash2 className="size-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
