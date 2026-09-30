"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, ListChecks, Lock, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { approveBudget, closeBudget } from "@/features/finance/actions";
import { BudgetLinesDialog } from "@/features/finance/components/budget-lines-dialog";
import type { getBudgetDetail } from "@/features/finance/queries";

type Line = NonNullable<Awaited<ReturnType<typeof getBudgetDetail>>>["lines"][number];

export function BudgetRowActions({
  budgetId,
  budgetName,
  status,
  lines,
  categories,
  funds,
  canManage,
  canApprove,
}: {
  budgetId: string;
  budgetName: string;
  status: string;
  lines: Line[];
  categories: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  canManage: boolean;
  canApprove: boolean;
}) {
  const [linesOpen, setLinesOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ error?: string }>) {
    startTransition(async () => {
      const res = await action(budgetId);
      if (res.error) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Actions" disabled={isPending}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setLinesOpen(true)}>
            <ListChecks className="size-4" />
            Lignes budgétaires ({lines.length})
          </DropdownMenuItem>
          {canApprove && status === "draft" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => run(approveBudget)}>
                <CheckCircle2 className="size-4" />
                Approuver
              </DropdownMenuItem>
            </>
          )}
          {canApprove && status === "active" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => run(closeBudget)}>
                <Lock className="size-4" />
                Clôturer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <BudgetLinesDialog
        budgetId={budgetId}
        budgetName={budgetName}
        lines={lines}
        categories={categories}
        funds={funds}
        canManage={canManage}
        open={linesOpen}
        onOpenChange={setLinesOpen}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
