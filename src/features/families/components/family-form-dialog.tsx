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
import type { FamilyActionState } from "@/features/families/actions";
import type { families } from "@/lib/db/schema";

const initialState: FamilyActionState = {};

export function FamilyFormDialog({
  action,
  people,
  family,
  trigger,
}: {
  action: (prev: FamilyActionState, formData: FormData) => Promise<FamilyActionState>;
  people: { id: string; name: string }[];
  family?: typeof families.$inferSelect;
  /** Omis pour l'édition : le déclencheur est alors géré par l'appelant (bouton "Modifier"). */
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Ferme le dialogue dans le callback de l'action elle-même plutôt que via un `useEffect` qui
  // observerait `state.success` : appeler un setState local directement dans un effet déclenche
  // un avertissement (rendu en cascade) — voir la règle `react-hooks/set-state-in-effect`.
  const [state, formAction, pending] = useActionState(async (prev: FamilyActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouvelle famille
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{family ? `Modifier ${family.name}` : "Nouvelle famille"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="family-name">Nom *</Label>
            <Input id="family-name" name="name" defaultValue={family?.name ?? ""} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="family-code">Code (optionnel)</Label>
              <Input id="family-code" name="familyCode" defaultValue={family?.familyCode ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="family-city">Ville (optionnel)</Label>
              <Input id="family-city" name="city" defaultValue={family?.city ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="family-address">Adresse (optionnel)</Label>
            <Input id="family-address" name="addressLine1" defaultValue={family?.addressLine1 ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="family-notes">Notes (optionnel)</Label>
            <textarea
              id="family-notes"
              name="notes"
              rows={2}
              defaultValue={family?.notes ?? ""}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="family-contact">Contact principal (optionnel)</Label>
            <FormSelect id="family-contact" name="primaryContactPersonId" defaultValue={family?.primaryContactPersonId ?? ""}>
              <option value="">—</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : family ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
