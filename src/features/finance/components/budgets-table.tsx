import { pastelStyleFor } from "@/lib/color-hash";
import { BUDGET_STATUS_LABELS } from "@/features/finance/schemas";
import { BudgetRowActions } from "@/features/finance/components/budget-row-actions";
import { executionColor, formatBudgetPeriod } from "@/features/finance/components/budget-utils";
import type { getBudgetLinesByBudget, getBudgetsOverview } from "@/features/finance/queries";

type Row = Awaited<ReturnType<typeof getBudgetsOverview>>["rows"][number];
type LinesByBudget = Awaited<ReturnType<typeof getBudgetLinesByBudget>>;

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-amber-50 text-amber-700",
  closed: "bg-green-50 text-green-700",
};

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

export function BudgetsTable({
  rows,
  linesByBudget,
  ministryByBudget,
  categories,
  funds,
  canManage,
  canApprove,
}: {
  rows: Row[];
  linesByBudget: LinesByBudget;
  ministryByBudget: Map<string, string>;
  categories: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  canManage: boolean;
  canApprove: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Nom du budget</th>
            <th className="px-3 py-2.5 font-medium">Catégories</th>
            <th className="px-3 py-2.5 font-medium">Montant prévu</th>
            <th className="px-3 py-2.5 font-medium">Montant engagé</th>
            <th className="px-3 py-2.5 font-medium">Reste à engager</th>
            <th className="px-3 py-2.5 font-medium">Taux d&apos;exécution</th>
            <th className="px-3 py-2.5 font-medium">Période</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const planned = Number(row.planned);
            const actual = Number(row.actual);
            const pct = planned > 0 ? Math.round((actual / planned) * 100) : 0;
            const lines = linesByBudget.get(row.id) ?? [];
            const names = Array.from(new Set(lines.map((l) => l.categoryName).filter((c): c is string => Boolean(c))));
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-navy">
                  {row.name}
                  {ministryByBudget.get(row.id) && <span className="block text-xs font-normal text-slate-400">{ministryByBudget.get(row.id)}</span>}
                </td>
                <td className="px-3 py-3">
                  {names.length === 0 ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-1">
                      {names.slice(0, 2).map((name) => (
                        <span key={name} className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pastelStyleFor(name).badge}`}>
                          {name}
                        </span>
                      ))}
                      {names.length > 2 && <span className="text-xs text-slate-400">+{names.length - 2}</span>}
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-navy">{n(planned)}</td>
                <td className="px-3 py-3 text-slate-600">{n(actual)}</td>
                <td className="px-3 py-3 text-slate-600">{n(Math.max(planned - actual, 0))}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <span className="block h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: executionColor(pct) }} />
                    </span>
                    <span className="w-9 text-xs font-medium text-slate-600">{pct}%</span>
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-500">{formatBudgetPeriod(row.startsOn, row.endsOn)}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[row.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {BUDGET_STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <BudgetRowActions
                    budgetId={row.id}
                    budgetName={row.name}
                    status={row.status}
                    lines={lines}
                    categories={categories}
                    funds={funds}
                    canManage={canManage}
                    canApprove={canApprove}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
