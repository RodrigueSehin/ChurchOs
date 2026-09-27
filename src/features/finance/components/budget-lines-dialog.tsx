"use client";

import { useActionState, useState, useTransition } from "react";
import { ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { EmptyState } from "@/components/shared/empty-state";
import { addBudgetLine, updateBudgetLineActual, type FinanceActionState } from "@/features/finance/actions";
import type { getBudgetDetail } from "@/features/finance/queries";

type Line = NonNullable<Awaited<ReturnType<typeof getBudgetDetail>>>["lines"][number];

const initialState: FinanceActionState = {};

function formatAmount(amount: string | number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(Number(amount));
}

export function BudgetLinesDialog({
  budgetId,
  budgetName,
  lines,
  categories,
  funds,
  canManage,
}: {
  budgetId: string;
  budgetName: string;
  lines: Line[];
  categories: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const boundAdd = addBudgetLine.bind(null, budgetId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);

  const totalPlanned = lines.reduce((sum, l) => sum + Number(l.plannedAmount), 0);
  const totalActual = lines.reduce((sum, l) => sum + Number(l.actualAmount), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <ListChecks className="size-4" />
        Lignes ({lines.length})
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lignes budgétaires — {budgetName}</DialogTitle>
        </DialogHeader>

        {lines.length === 0 ? (
          <EmptyState icon={ListChecks} title="Aucune ligne" description="Ajoutez des lignes budgétaires par catégorie et fonds." />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2 px-1 text-xs font-medium text-slate-400">
              <span>Catégorie / Fonds</span>
              <span className="text-right">Planifié</span>
              <span className="text-right">Réel</span>
            </div>
            {lines.map((line) => (
              <LineRow key={line.id} line={line} canManage={canManage} />
            ))}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 px-1 pt-2 text-sm font-semibold text-navy">
              <span>Total</span>
              <span className="text-right">{formatAmount(totalPlanned)}</span>
              <span className="text-right">{formatAmount(totalActual)}</span>
            </div>
          </div>
        )}

        {canManage && (
          <form action={formAction} className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <FormSelect name="categoryId" defaultValue="">
                <option value="">Catégorie (optionnel)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormSelect>
              <FormSelect name="fundId" defaultValue="">
                <option value="">Fonds (optionnel)</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex items-end gap-2">
              <Input name="plannedAmount" type="number" min={0} step="0.01" placeholder="Montant planifié" required className="flex-1" />
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Ajout..." : "Ajouter"}
              </Button>
            </div>
            {state.error && <p className="text-xs text-danger">{state.error}</p>}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LineRow({ line, canManage }: { line: Line; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleActualChange(value: string) {
    startTransition(async () => {
      const res = await updateBudgetLineActual(line.id, value);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="grid grid-cols-3 items-center gap-2 rounded-lg border border-slate-100 px-1 py-1.5 text-sm">
      <span className="truncate text-navy">
        {line.categoryName ?? "—"}
        {line.fundName ? ` · ${line.fundName}` : ""}
      </span>
      <span className="text-right text-slate-500">{formatAmount(line.plannedAmount)}</span>
      {canManage ? (
        <Input
          type="number"
          min={0}
          step="0.01"
          defaultValue={line.actualAmount}
          disabled={isPending}
          onBlur={(e) => handleActualChange(e.target.value)}
          className="h-8 text-right"
        />
      ) : (
        <span className="text-right text-slate-500">{formatAmount(line.actualAmount)}</span>
      )}
      {error && <p className="col-span-3 text-xs text-danger">{error}</p>}
    </div>
  );
}
