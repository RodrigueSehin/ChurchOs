"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, Eye, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveMember } from "@/features/members/actions";

export function MemberRowActions({
  memberId,
  name,
  canUpdate,
  canDelete,
}: {
  memberId: string;
  name: string;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    startTransition(async () => {
      const res = await archiveMember(memberId);
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
            <Link href={`/members/${memberId}`}>
              <Eye className="size-4" />
              Voir le profil
            </Link>
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem asChild>
              <Link href={`/members/${memberId}/edit`}>
                <Pencil className="size-4" />
                Modifier
              </Link>
            </DropdownMenuItem>
          )}
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
          title="Archiver ce membre ?"
          description={`« ${name} » sera marqué comme archivé.`}
          confirmLabel="Archiver"
          variant="destructive"
          onConfirm={handleArchive}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
