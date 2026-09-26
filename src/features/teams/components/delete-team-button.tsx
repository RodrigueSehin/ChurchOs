"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteTeam } from "@/features/teams/actions";

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteTeam(teamId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        }
        title="Supprimer cette équipe ?"
        description={`"${teamName}" sera définitivement supprimée.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
