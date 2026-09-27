"use client";

import { useActionState, useState } from "react";
import { Plus, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createEventCategory, type EventActionState } from "@/features/events/actions";
import type { getEventCategories } from "@/features/events/queries";

const initialState: EventActionState = {};

type Category = Awaited<ReturnType<typeof getEventCategories>>[number];

export function EventCategoryManager({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createEventCategory, initialState);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Tag className="size-4" />
        Catégories
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Catégories d&apos;événements</DialogTitle>
          </DialogHeader>

          {categories.length === 0 ? (
            <EmptyState icon={Tag} title="Aucune catégorie" description="Créez la première catégorie (ex : Culte spécial, Conférence)." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-navy">
                  {c.color && <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />}
                  {c.name}
                </li>
              ))}
            </ul>
          )}

          <form action={formAction} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-name">Nom</Label>
                <Input id="category-name" name="name" placeholder="Ex : Conférence" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="category-color">Couleur (optionnel)</Label>
                <Input id="category-color" name="color" type="color" defaultValue="#1d4ed8" className="h-10 w-20 p-1" />
              </div>
            </div>
            {state.error && <p className="text-sm text-danger">{state.error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                <Plus className="size-4" />
                {pending ? "Ajout..." : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
