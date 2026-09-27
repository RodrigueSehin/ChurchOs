"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { updateEvent, type EventActionState } from "@/features/events/actions";
import { EVENT_STATUS_LABELS, EVENT_VISIBILITY_LABELS } from "@/features/events/schemas";
import type { events } from "@/lib/db/schema";

const initialState: EventActionState = {};

function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventEditDialog({
  event,
  categories,
}: {
  event: typeof events.$inferSelect;
  categories: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateEvent.bind(null, event.id);
  const [state, formAction, pending] = useActionState(async (prev: EventActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-4" />
        Modifier
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier {event.title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-event-title">Titre *</Label>
            <Input id="edit-event-title" name="title" defaultValue={event.title} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-event-description">Description (optionnel)</Label>
            <textarea
              id="edit-event-description"
              name="description"
              rows={3}
              defaultValue={event.description ?? ""}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-categoryId">Catégorie (optionnel)</Label>
              <FormSelect id="edit-event-categoryId" name="categoryId" defaultValue={event.categoryId ?? ""}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-location">Lieu (optionnel)</Label>
              <Input id="edit-event-location" name="location" defaultValue={event.location ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-startsAt">Début *</Label>
              <Input id="edit-event-startsAt" name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(event.startsAt)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-endsAt">Fin (optionnel)</Label>
              <Input id="edit-event-endsAt" name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(event.endsAt)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-visibility">Visibilité</Label>
              <FormSelect id="edit-event-visibility" name="visibility" defaultValue={event.visibility}>
                {Object.entries(EVENT_VISIBILITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-status">Statut</Label>
              <FormSelect id="edit-event-status" name="status" defaultValue={event.status}>
                {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-capacity">Capacité</Label>
              <Input id="edit-event-capacity" name="capacity" type="number" min={1} defaultValue={event.capacity ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox name="registrationEnabled" defaultChecked={event.registrationEnabled} />
              Inscriptions ouvertes
            </label>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-event-price">Prix</Label>
              <Input id="edit-event-price" name="price" type="number" min={0} step="0.01" defaultValue={event.price} />
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
