import { ArrowDown, ArrowUp, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import type { FinanceOverview } from "@/features/dashboard/queries";

function formatXOF(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function DeltaBadge({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", positive ? "text-success" : "text-danger")}>
      <Icon className="size-3" />
      {positive ? "+" : ""}
      {value}%
    </span>
  );
}

export function FinanceOverviewCard({ overview }: { overview: FinanceOverview }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
          <ArrowUp className="size-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-navy">{formatXOF(overview.income)}</p>
          <p className="text-xs text-slate-500">Dons &amp; offrandes</p>
          <div className="mt-1">
            <DeltaBadge value={overview.incomeDeltaPct} />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ArrowDown className="size-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-navy">{formatXOF(overview.expenses)}</p>
          <p className="text-xs text-slate-500">Dépenses</p>
          <div className="mt-1">
            <DeltaBadge value={overview.expensesDeltaPct} />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Wallet className="size-4" />
        </span>
        <div>
          <p className="text-lg font-bold text-navy">{formatXOF(overview.balance)}</p>
          <p className="text-xs text-slate-500">Solde</p>
          <div className="mt-1">
            <DeltaBadge value={overview.balanceDeltaPct} />
          </div>
        </div>
      </div>
    </div>
  );
}
