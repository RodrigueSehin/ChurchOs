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
import { createBudget, type FinanceActionState } from "@/features/finance/actions";

const initialState: FinanceActionState = {};

export function BudgetFormDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FinanceActionState, formData: FormData) => {
    const result = await createBudget(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  const currentYear = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouveau budget
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau budget</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-name">Nom *</Label>
            <Input id="budget-name" name="name" placeholder="Ex : Budget annuel" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="budget-fiscalYear">Exercice *</Label>
            <Input id="budget-fiscalYear" name="fiscalYear" type="number" defaultValue={currentYear} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-startsOn">Début *</Label>
              <Input id="budget-startsOn" name="startsOn" type="date" defaultValue={`${currentYear}-01-01`} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="budget-endsOn">Fin *</Label>
              <Input id="budget-endsOn" name="endsOn" type="date" defaultValue={`${currentYear}-12-31`} required />
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
