"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteEvent } from "@/features/events/actions";
import { EventEditDialog } from "@/features/events/components/event-edit-dialog";
import type { getEvents } from "@/features/events/queries";

type EventRow = Awaited<ReturnType<typeof getEvents>>["rows"][number];

export function EventRowActions({
  event,
  categories,
  canUpdate,
  canDelete,
}: {
  event: EventRow;
  categories: { id: string; name: string }[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteEvent(event.id);
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
          <DropdownMenuItem asChild>
            <Link href={`/events/${event.id}`}>
              <Eye className="size-4" />
              Voir l&apos;événement
            </Link>
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem onSelect={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Modifier
            </DropdownMenuItem>
          )}
          {canDelete && (
            <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-danger">
              <Trash2 className="size-4" />
              Supprimer
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canUpdate && (
        <EventEditDialog event={event} categories={categories} trigger={<span className="hidden" />} open={editOpen} onOpenChange={setEditOpen} />
      )}

      {canDelete && (
        <ConfirmDialog
          trigger={<span className="hidden" />}
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Supprimer cet événement ?"
          description={`« ${event.title} » sera définitivement supprimé, avec ses inscriptions et présences.`}
          confirmLabel="Supprimer"
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
