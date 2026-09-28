"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteGroup } from "@/features/groups/actions";

export function GroupRowActions({ groupId, groupName, canDelete }: { groupId: string; groupName: string; canDelete: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteGroup(groupId);
      if (res.error) setError(res.error);
      else router.refresh();
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
          <DropdownMenuItem asChild>
            <Link href={`/groups/${groupId}`}>
              <Eye className="size-4" />
              Voir le groupe
            </Link>
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
              <Trash2 className="size-4" />
              Supprimer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canDelete && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Supprimer ce groupe ?"
          description={`« ${groupName} » sera définitivement supprimé. Les personnes elles-mêmes ne sont pas supprimées.`}
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
