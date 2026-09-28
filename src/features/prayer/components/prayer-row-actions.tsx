"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Eye, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archivePrayerRequest } from "@/features/prayer/actions";

export function PrayerRowActions({ id, title, canDelete }: { id: string; title: string; canDelete: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    startTransition(async () => {
      const res = await archivePrayerRequest(id);
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
            <Link href={`/prayer/${id}`}>
              <Eye className="size-4" />
              Voir le sujet
            </Link>
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
              <Archive className="size-4" />
              Archiver
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canDelete && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Archiver ce sujet ?"
          description={`« ${title} » sera marqué comme archivé.`}
          confirmLabel="Archiver"
          variant="destructive"
          onConfirm={handleArchive}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
