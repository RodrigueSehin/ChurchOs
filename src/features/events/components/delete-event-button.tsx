"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteEvent } from "@/features/events/actions";

export function DeleteEventButton({ eventId, eventTitle }: { eventId: string; eventTitle: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteEvent(eventId);
      if (res.error) setError(res.error);
      else router.push("/events");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="outline" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        }
        title="Supprimer cet événement ?"
        description={`"${eventTitle}" sera définitivement supprimé, avec ses inscriptions et présences.`}
        confirmLabel="Supprimer"
        variant="destructive"
        onConfirm={handleDelete}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
