"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { archivePrayerRequest } from "@/features/prayer/actions";

export function ArchivePrayerButton({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    startTransition(async () => {
      const res = await archivePrayerRequest(id);
      if (res.error) setError(res.error);
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
        title="Archiver ce sujet de prière ?"
        description={`"${title}" sera marqué comme archivé.`}
        confirmLabel="Archiver"
        variant="destructive"
        onConfirm={handleArchive}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
