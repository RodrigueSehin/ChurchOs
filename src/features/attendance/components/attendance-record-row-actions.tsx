"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock3, MoreHorizontal, Trash2, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteAttendanceRecord, updateAttendanceRecordStatus } from "@/features/attendance/actions";

export function AttendanceRecordRowActions({
  recordId,
  name,
  status,
  canUpdate,
  canDelete,
}: {
  recordId: string;
  name: string;
  status: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatus(next: string) {
    startTransition(async () => {
      const res = await updateAttendanceRecordStatus(recordId, next);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteAttendanceRecord(recordId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  if (!canUpdate && !canDelete) return null;

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions" disabled={isPending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdate && (
            <>
              {status !== "present" && (
                <DropdownMenuItem onSelect={() => handleStatus("present")}>
                  <CheckCircle2 className="size-4" />
                  Marquer présent
                </DropdownMenuItem>
              )}
              {status !== "late" && (
                <DropdownMenuItem onSelect={() => handleStatus("late")}>
                  <Clock3 className="size-4" />
                  Marquer en retard
                </DropdownMenuItem>
              )}
              {status !== "excused" && (
                <DropdownMenuItem onSelect={() => handleStatus("excused")}>
                  <UserX className="size-4" />
                  Marquer excusé
                </DropdownMenuItem>
              )}
              {status !== "absent" && (
                <DropdownMenuItem onSelect={() => handleStatus("absent")} className="text-danger">
                  <UserX className="size-4" />
                  Marquer absent
                </DropdownMenuItem>
              )}
            </>
          )}
          {canDelete && (
            <>
              {canUpdate && <DropdownMenuSeparator />}
              <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
                <Trash2 className="size-4" />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canDelete && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Supprimer cette présence ?"
          description={`La présence de « ${name} » sera définitivement supprimée.`}
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
