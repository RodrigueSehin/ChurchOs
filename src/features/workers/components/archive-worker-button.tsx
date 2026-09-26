"use client";

import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { archiveWorker } from "@/features/workers/actions";

export function ArchiveWorkerButton({ workerId, workerName }: { workerId: string; workerName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveWorker(workerId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmDialog
        trigger={
          <Button type="button" variant="ghost" size="sm" disabled={isPending} className="text-danger hover:bg-danger/10">
            <Archive className="size-4" />
            Archiver
          </Button>
        }
        title="Archiver cet ouvrier ?"
        description={`"${workerName}" sera marqué comme archivé.`}
        confirmLabel="Archiver"
        variant="destructive"
        onConfirm={handleArchive}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
