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
import { createTransaction, type FinanceActionState } from "@/features/finance/actions";
import { PAYMENT_METHOD_LABELS } from "@/features/finance/schemas";

const initialState: FinanceActionState = {};

export function TransactionFormDialog({
  type,
  categories,
  funds,
  accounts,
  people,
}: {
  type: "income" | "expense";
  categories: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  people: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: FinanceActionState, formData: FormData) => {
    const result = await createTransaction(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  const label = type === "income" ? "recette" : "dépense";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouvelle {label}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle {label}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-amount">Montant *</Label>
              <Input id="tx-amount" name="amount" type="number" min={0.01} step="0.01" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-transactionDate">Date *</Label>
              <Input id="tx-transactionDate" name="transactionDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-categoryId">Catégorie (optionnel)</Label>
              <FormSelect id="tx-categoryId" name="categoryId" defaultValue="">
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-fundId">Fonds (optionnel)</Label>
              <FormSelect id="tx-fundId" name="fundId" defaultValue="">
                <option value="">—</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-accountId">Compte (optionnel)</Label>
              <FormSelect id="tx-accountId" name="accountId" defaultValue="">
                <option value="">—</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-paymentMethod">Mode de paiement (optionnel)</Label>
              <FormSelect id="tx-paymentMethod" name="paymentMethod" defaultValue="">
                <option value="">—</option>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          {type === "income" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-donorPersonId">Donateur (optionnel)</Label>
              <FormSelect id="tx-donorPersonId" name="donorPersonId" defaultValue="">
                <option value="">Anonyme</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-description">Description (optionnel)</Label>
            <Input id="tx-description" name="description" />
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
