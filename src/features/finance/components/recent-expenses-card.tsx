import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pastelStyleFor } from "@/lib/color-hash";
import { TransactionStatusBadge } from "@/features/finance/components/transaction-status-badge";
import { formatMoney } from "@/features/finance/format";
import type { getRecentTransactions } from "@/features/finance/queries";

type Row = Awaited<ReturnType<typeof getRecentTransactions>>[number];

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function RecentExpensesCard({ rows }: { rows: Row[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Dépenses récentes</CardTitle>
        <Link href="/finance/budgets" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Voir les budgets <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Aucune dépense pour le moment.</p>
        ) : (
          rows.map((r) => {
            const style = pastelStyleFor(r.categoryName ?? "");
            return (
              <div key={r.id} className="flex items-center gap-3">
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${style.badge}`}>
                  <Receipt className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-navy">{r.title ?? r.description ?? r.categoryName ?? "Dépense"}</p>
                  <p className="text-xs text-slate-400">{formatDate(r.transactionDate)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-sm font-semibold text-navy">{formatMoney(r.amount, r.currency)}</span>
                  <TransactionStatusBadge status={r.status} />
                </div>
              </div>
            );
          })
        )}
        <Button asChild variant="outline" className="w-full">
          <Link href="/finance/expenses">
            Voir toutes les dépenses <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
