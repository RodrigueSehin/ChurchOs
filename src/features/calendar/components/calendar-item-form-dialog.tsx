"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

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
import { createCalendarItem, type CalendarActionState } from "@/features/calendar/actions";

const initialState: CalendarActionState = {};

export function CalendarItemFormDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: CalendarActionState, formData: FormData) => {
    const result = await createCalendarItem(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouvelle entrée
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle entrée de calendrier</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendar-title">Titre *</Label>
            <Input id="calendar-title" name="title" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendar-description">Description (optionnel)</Label>
            <Input id="calendar-description" name="description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calendar-startsAt">Début *</Label>
              <Input id="calendar-startsAt" name="startsAt" type="datetime-local" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calendar-endsAt">Fin (optionnel)</Label>
              <Input id="calendar-endsAt" name="endsAt" type="datetime-local" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calendar-category">Catégorie (optionnel)</Label>
              <Input id="calendar-category" name="category" placeholder="Ex : Réunion, Formation..." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="calendar-color">Couleur (optionnel)</Label>
              <Input id="calendar-color" name="color" type="color" defaultValue="#64748b" className="h-10 w-20 p-1" />
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
