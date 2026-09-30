import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pastelStyleFor } from "@/lib/color-hash";
import type { getActiveBudgetProgress } from "@/features/finance/queries";

type Progress = NonNullable<Awaited<ReturnType<typeof getActiveBudgetProgress>>>;

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function BudgetProgressCard({ progress }: { progress: Progress | null }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Budgets</CardTitle>
        <Link href="/finance/budgets" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
          Voir les budgets <ArrowRight className="size-3" />
        </Link>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!progress || progress.lines.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">Aucun budget actif.</p>
        ) : (
          progress.lines.map((l) => {
            const planned = Number(l.plannedAmount);
            const actual = Number(l.actualAmount);
            const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
            const name = l.categoryName ?? "Sans catégorie";
            return (
              <div key={l.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-navy">{name}</span>
                  <span className={`shrink-0 font-semibold ${pct > 100 ? "text-danger" : "text-navy"}`}>{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 100 ? "#DC2626" : pastelStyleFor(name).dot }} />
                </div>
                <p className="text-xs text-slate-400">
                  {n(actual)} / {n(planned)}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
