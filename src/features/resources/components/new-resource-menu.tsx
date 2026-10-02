"use client";

import Link from "next/link";
import { ChevronDown, DoorOpen, Monitor, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Bouton bleu « Nouvelle salle » avec menu : Nouvelle salle / Nouvel équipement (pages de formulaire dédiées). */
export function NewResourceMenu() {
  return (
    <div className="flex">
      <Button asChild className="rounded-r-none">
        <Link href="/resources/new-room">
          <Plus className="size-4" />
          Nouvelle salle
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" aria-label="Plus d'options" className="rounded-l-none border-l border-white/30 px-2.5">
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem asChild>
            <Link href="/resources/new-room">
              <DoorOpen className="size-4" />
              Nouvelle salle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/resources/new-equipment">
              <Monitor className="size-4" />
              Nouvel équipement
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
