import Link from "next/link";
import { ArrowRight, Info, PiggyBank } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pastelStyleFor } from "@/lib/color-hash";
import { executionColor } from "@/features/finance/components/budget-utils";
import { formatMoney } from "@/features/finance/format";
import type { getRecentBudgets } from "@/features/finance/queries";

type Row = Awaited<ReturnType<typeof getRecentBudgets>>[number];

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function RecentBudgetsCard({ rows, currency }: { rows: Row[]; currency: string }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Budget récent</CardTitle>
          <Link href="/finance/budgets" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            Voir tous <ArrowRight className="size-3" />
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {rows.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Aucun budget pour le moment.</p>
          ) : (
            rows.map((r) => {
              const planned = Number(r.planned);
              const pct = planned > 0 ? Math.round((Number(r.actual) / planned) * 100) : 0;
              return (
                <div key={r.id} className="flex items-center gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${pastelStyleFor(r.name).badge}`}>
                    <PiggyBank className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">{r.name}</p>
                    <p className="text-xs text-slate-400">Mis à jour le {dateFormat.format(r.updatedAt)}</p>
                  </div>
                  <div className="flex w-28 shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-navy">{formatMoney(planned, currency)}</span>
                    <span className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: executionColor(pct) }} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="rounded-xl bg-blue-50 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <Info className="size-4" />
          </span>
          <div>
            <p className="text-base font-semibold text-navy">Conseil</p>
            <p className="mt-1 text-sm text-slate-600">
              Suivez régulièrement l&apos;exécution de vos budgets pour mieux planifier les activités de l&apos;église.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
