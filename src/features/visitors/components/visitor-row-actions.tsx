"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, UserCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { convertVisitorToMember } from "@/features/visitors/actions";

export function VisitorRowActions({
  visitorId,
  name,
  status,
  canConvert,
}: {
  visitorId: string;
  name: string;
  status: string;
  canConvert: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConvert() {
    startTransition(async () => {
      const res = await convertVisitorToMember(visitorId);
      if (res?.error) setError(res.error);
      // En cas de succès, l'action redirige elle-même vers /members/[id].
    });
  }

  const showConvert = canConvert && status !== "converted";

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
            <Link href={`/visitors/${visitorId}`}>
              <Eye className="size-4" />
              Voir le profil
            </Link>
          </DropdownMenuItem>
          {showConvert && (
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)}>
              <UserCheck className="size-4" />
              Convertir en membre
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {showConvert && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Convertir en membre ?"
          description={`${name} deviendra membre de l'église. Son historique de visite est conservé.`}
          confirmLabel="Convertir"
          onConfirm={handleConvert}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
