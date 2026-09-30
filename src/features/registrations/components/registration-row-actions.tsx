"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock, MoreHorizontal, QrCode, ThumbsDown, ThumbsUp, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteRegistration, updateRegistrationStatus } from "@/features/registrations/actions";
import { RegistrationQrDialog } from "@/features/registrations/components/registration-qr-dialog";
import type { getRegistrations } from "@/features/registrations/queries";

type Row = Awaited<ReturnType<typeof getRegistrations>>["rows"][number];

export function RegistrationRowActions({ row, name, canUpdate, canDelete }: { row: Row; name: string; canUpdate: boolean; canDelete: boolean }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(status: string) {
    startTransition(async () => {
      const res = await updateRegistrationStatus(row.id, status);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteRegistration(row.id);
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
          {row.qrToken && (
            <DropdownMenuItem onSelect={() => setQrOpen(true)}>
              <QrCode className="size-4" />
              Voir le QR
            </DropdownMenuItem>
          )}
          {canUpdate && (
            <>
              {row.qrToken && <DropdownMenuSeparator />}
              {row.status !== "confirmed" && (
                <DropdownMenuItem onSelect={() => handleStatus("confirmed")}>
                  <CheckCircle2 className="size-4" />
                  Confirmer
                </DropdownMenuItem>
              )}
              {row.status !== "pending" && (
                <DropdownMenuItem onSelect={() => handleStatus("pending")}>
                  <Clock className="size-4" />
                  Mettre en attente
                </DropdownMenuItem>
              )}
              {row.status !== "attended" && (
                <DropdownMenuItem onSelect={() => handleStatus("attended")}>
                  <ThumbsUp className="size-4" />
                  Marquer présent
                </DropdownMenuItem>
              )}
              {row.status !== "no_show" && (
                <DropdownMenuItem onSelect={() => handleStatus("no_show")}>
                  <ThumbsDown className="size-4" />
                  Marquer absent
                </DropdownMenuItem>
              )}
              {row.status !== "cancelled" && (
                <DropdownMenuItem onSelect={() => handleStatus("cancelled")} className="text-danger">
                  <XCircle className="size-4" />
                  Annuler
                </DropdownMenuItem>
              )}
            </>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
                <Trash2 className="size-4" />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {row.qrToken && <RegistrationQrDialog registrationId={row.id} name={name} trigger={<span className="hidden" />} open={qrOpen} onOpenChange={setQrOpen} />}

      {canDelete && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Supprimer cette inscription ?"
          description={`L'inscription de « ${name} » sera définitivement supprimée.`}
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
