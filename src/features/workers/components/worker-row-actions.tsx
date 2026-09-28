"use client";

import { useState, useTransition } from "react";
import { Archive, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveWorker, updateWorker } from "@/features/workers/actions";
import { WorkerFormDialog } from "@/features/workers/components/worker-form-dialog";
import type { getWorkers } from "@/features/workers/queries";

type WorkerRow = Awaited<ReturnType<typeof getWorkers>>["rows"][number];

export function WorkerRowActions({
  worker,
  people,
  canUpdate,
}: {
  worker: WorkerRow;
  people: { id: string; name: string }[];
  canUpdate: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canUpdate) return null;

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveWorker(worker.id);
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
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Modifier
          </DropdownMenuItem>
          {worker.status !== "archived" && (
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
              <Archive className="size-4" />
              Archiver
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <WorkerFormDialog
        action={updateWorker.bind(null, worker.id)}
        people={people}
        worker={worker}
        trigger={<span className="hidden" />}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ConfirmDialog
        trigger={<span className="hidden" />}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Archiver cet ouvrier ?"
        description={`« ${worker.firstName} ${worker.lastName} » sera marqué comme archivé.`}
        confirmLabel="Archiver"
        variant="destructive"
        onConfirm={handleArchive}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
