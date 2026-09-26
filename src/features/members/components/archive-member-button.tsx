"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { archiveMember } from "@/features/members/actions";

export function ArchiveMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveMember(memberId);
      if (res.error) setError(res.error);
      // Action peu fréquente : rechargement complet pour refléter le nouveau statut partout
      // (voir la note dans features/rbac/components/members-table.tsx sur `revalidatePath`).
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="outline" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
            <Archive className="size-4" />
            Archiver
          </Button>
        }
        title="Archiver ce membre ?"
        description={`"${memberName}" sera marqué comme archivé. Réversible depuis la fiche du membre.`}
        confirmLabel="Archiver"
        variant="destructive"
        onConfirm={handleArchive}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
