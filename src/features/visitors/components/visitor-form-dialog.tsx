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
import type { VisitorActionState } from "@/features/visitors/actions";
import type { people, visitors } from "@/lib/db/schema";

const initialState: VisitorActionState = {};

export function VisitorFormDialog({
  action,
  inviters,
  visitor,
  trigger,
}: {
  action: (prev: VisitorActionState, formData: FormData) => Promise<VisitorActionState>;
  inviters: { id: string; name: string }[];
  visitor?: { person: typeof people.$inferSelect; visitor: typeof visitors.$inferSelect };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: VisitorActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nouveau visiteur
        </Button>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{visitor ? "Modifier le visiteur" : "Nouveau visiteur"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-firstName">Prénom *</Label>
              <Input id="visitor-firstName" name="firstName" defaultValue={visitor?.person.firstName ?? ""} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-lastName">Nom *</Label>
              <Input id="visitor-lastName" name="lastName" defaultValue={visitor?.person.lastName ?? ""} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-email">Email (optionnel)</Label>
              <Input id="visitor-email" name="email" type="email" defaultValue={visitor?.person.email ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-phone">Téléphone (optionnel)</Label>
              <Input id="visitor-phone" name="phone" type="tel" defaultValue={visitor?.person.phone ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-firstVisitDate">Date de première visite</Label>
              <Input
                id="visitor-firstVisitDate"
                name="firstVisitDate"
                type="date"
                defaultValue={visitor?.visitor.firstVisitDate ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="visitor-source">Source (optionnel)</Label>
              <Input id="visitor-source" name="source" defaultValue={visitor?.visitor.source ?? ""} placeholder="Ex : Invité par un ami" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visitor-invitedBy">Invité par (optionnel)</Label>
            <FormSelect id="visitor-invitedBy" name="invitedByPersonId" defaultValue={visitor?.visitor.invitedByPersonId ?? ""}>
              <option value="">—</option>
              {inviters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visitor-followUpDate">Date de relance (optionnel)</Label>
            <Input id="visitor-followUpDate" name="followUpDate" type="date" defaultValue={visitor?.visitor.followUpDate ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visitor-notes">Notes (optionnel)</Label>
            <textarea
              id="visitor-notes"
              name="notes"
              rows={3}
              defaultValue={visitor?.visitor.notes ?? ""}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Enregistrement..." : visitor ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
