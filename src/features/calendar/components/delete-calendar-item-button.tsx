"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCalendarItem } from "@/features/calendar/actions";

export function DeleteCalendarItemButton({ itemId, itemTitle }: { itemId: string; itemTitle: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteCalendarItem(itemId);
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
          </Button>
        }
        title="Supprimer cette entrée ?"
        description={`"${itemTitle}" sera définitivement supprimée du calendrier.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
