"use client";

import { useState } from "react";
import { ChevronDown, DoorOpen, Monitor, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createResource } from "@/features/resources/actions";
import { ResourceFormDialog } from "@/features/resources/components/resource-form-dialog";

/** Bouton bleu « Nouvelle salle » avec menu : Nouvelle salle / Nouvel équipement. */
export function NewResourceMenu({ rooms }: { rooms: { id: string; name: string }[] }) {
  const [creating, setCreating] = useState<"room" | "equipment" | null>(null);

  return (
    <>
      <div className="flex">
        <Button type="button" onClick={() => setCreating("room")} className="rounded-r-none">
          <Plus className="size-4" />
          Nouvelle salle
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" aria-label="Plus d'options" className="rounded-l-none border-l border-white/30 px-2.5">
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem onSelect={() => setCreating("room")}>
              <DoorOpen className="size-4" />
              Nouvelle salle
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setCreating("equipment")}>
              <Monitor className="size-4" />
              Nouvel équipement
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {creating && (
        <ResourceFormDialog key={creating} action={createResource} presetType={creating} rooms={rooms} open onOpenChange={(o) => !o && setCreating(null)} />
      )}
    </>
  );
}
