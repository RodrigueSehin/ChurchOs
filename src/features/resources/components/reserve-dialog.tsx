"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createReservation, type ResourceActionState } from "@/features/resources/actions";

const initialState: ResourceActionState = {};

/** Réservation d'une salle ou d'un équipement (ouverte depuis le panneau de détail ou le menu d'une ligne). */
export function ReserveDialog({ resourceId, resourceName, open, onOpenChange }: { resourceId: string; resourceName: string; open: boolean; onOpenChange: (v: boolean) => void }) {
  const boundAction = createReservation.bind(null, resourceId);
  const [state, formAction, pending] = useActionState(async (prev: ResourceActionState, formData: FormData) => {
    const result = await boundAction(prev, formData);
    if (result.success) {
      onOpenChange(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Réserver « {resourceName} »</DialogTitle>
          <DialogDescription>La réservation est créée « En attente » jusqu&apos;à sa confirmation par un gestionnaire.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`reservation-startsAt-${resourceId}`}>Début *</Label>
              <Input id={`reservation-startsAt-${resourceId}`} name="startsAt" type="datetime-local" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`reservation-endsAt-${resourceId}`}>Fin *</Label>
              <Input id={`reservation-endsAt-${resourceId}`} name="endsAt" type="datetime-local" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`reservation-purpose-${resourceId}`}>Motif (optionnel)</Label>
            <Input id={`reservation-purpose-${resourceId}`} name="purpose" placeholder="Ex : Répétition chorale" />
          </div>
          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Réservation..." : "Réserver"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
