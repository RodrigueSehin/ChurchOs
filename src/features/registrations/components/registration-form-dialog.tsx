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
import { FormSelect } from "@/components/shared/form-select";
import { createRegistration, type RegistrationActionState } from "@/features/registrations/actions";

const initialState: RegistrationActionState = {};

export function RegistrationFormDialog({
  events,
  people,
  defaultEventId,
}: {
  events: { id: string; title: string }[];
  people: { id: string; name: string }[];
  defaultEventId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: RegistrationActionState, formData: FormData) => {
    const result = await createRegistration(prev, formData);
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
        Nouvelle inscription
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle inscription</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="registration-eventId">Événement *</Label>
            <FormSelect id="registration-eventId" name="eventId" required defaultValue={defaultEventId ?? ""}>
              <option value="" disabled>
                Choisir un événement
              </option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="registration-personId">Personne (optionnel)</Label>
            <FormSelect id="registration-personId" name="personId" defaultValue="">
              <option value="">Invité (sans compte)</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registration-guestName">Nom de l&apos;invité (si pas de personne)</Label>
              <Input id="registration-guestName" name="guestName" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="registration-guestEmail">Email de l&apos;invité (optionnel)</Label>
              <Input id="registration-guestEmail" name="guestEmail" type="email" />
            </div>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Inscription..." : "Inscrire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
