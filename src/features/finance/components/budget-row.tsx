"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveBudget, closeBudget } from "@/features/finance/actions";
import { BUDGET_STATUS_LABELS } from "@/features/finance/schemas";
import { BudgetLinesDialog } from "@/features/finance/components/budget-lines-dialog";
import type { getBudgetDetail, getBudgets } from "@/features/finance/queries";

type Budget = Awaited<ReturnType<typeof getBudgets>>[number];
type Line = NonNullable<Awaited<ReturnType<typeof getBudgetDetail>>>["lines"][number];

const STATUS_VARIANT: Record<string, "secondary" | "success" | "default"> = {
  draft: "secondary",
  active: "success",
  closed: "default",
};

export function BudgetRow({
  budget,
  lines,
  categories,
  funds,
  canManage,
  canApprove,
}: {
  budget: Budget;
  lines: Line[];
  categories: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  canManage: boolean;
  canApprove: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    startTransition(async () => {
      const res = await approveBudget(budget.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  function handleClose() {
    startTransition(async () => {
      const res = await closeBudget(budget.id);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-navy">{budget.name}</p>
          <Badge variant={STATUS_VARIANT[budget.status] ?? "secondary"}>{BUDGET_STATUS_LABELS[budget.status] ?? budget.status}</Badge>
        </div>
        <p className="text-sm text-slate-400">
          Exercice {budget.fiscalYear} · {budget.startsOn} – {budget.endsOn}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <BudgetLinesDialog budgetId={budget.id} budgetName={budget.name} lines={lines} categories={categories} funds={funds} canManage={canManage} />
        {canApprove && budget.status === "draft" && (
          <Button type="button" size="sm" disabled={isPending} onClick={handleApprove}>
            <CheckCircle2 className="size-4" />
            Approuver
          </Button>
        )}
        {canApprove && budget.status === "active" && (
          <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={handleClose}>
            <Lock className="size-4" />
            Clôturer
          </Button>
        )}
      </div>
    </div>
  );
}
