import { pastelStyleFor } from "@/lib/color-hash";
import { executionColor } from "@/features/finance/components/budget-utils";
import type { ReportData } from "@/features/finance/reports/queries";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(value));
}

function Rate({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(value, 100)}%`, backgroundColor: executionColor(value) }} />
      </span>
      <span className="w-10 text-xs font-medium text-slate-600">{value}%</span>
    </span>
  );
}

export function ReportCategoryTable({ data }: { data: ReportData }) {
  if (data.categories.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune opération sur cette période.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-semibold text-navy">Catégorie</th>
            <th className="px-3 py-2.5 text-right font-semibold text-navy">Revenus</th>
            <th className="px-3 py-2.5 text-right font-semibold text-navy">Dépenses</th>
            <th className="px-3 py-2.5 text-right font-semibold text-navy">Solde</th>
            <th className="px-3 py-2.5 font-semibold text-navy">Taux d&apos;exécution</th>
          </tr>
        </thead>
        <tbody>
          {data.categories.map((c) => {
            const balance = c.income - c.expense;
            return (
              <tr key={c.name} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pastelStyleFor(c.name).badge}`}>{c.name}</span>
                </td>
                <td className="px-3 py-3 text-right text-slate-700">{n(c.income)}</td>
                <td className="px-3 py-3 text-right text-slate-700">{n(c.expense)}</td>
                <td className={`px-3 py-3 text-right font-medium ${balance < 0 ? "text-danger" : "text-success"}`}>{n(balance)}</td>
                <td className="px-3 py-3">
                  <Rate value={c.planned > 0 ? Math.round((c.expense / c.planned) * 100) : null} />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-navy">
            <td className="px-4 py-3">Total</td>
            <td className="px-3 py-3 text-right">{n(data.totals.revenue)}</td>
            <td className="px-3 py-3 text-right">{n(data.totals.expenses)}</td>
            <td className={`px-3 py-3 text-right ${data.totals.balance < 0 ? "text-danger" : "text-success"}`}>{n(data.totals.balance)}</td>
            <td className="px-3 py-3">
              <Rate value={data.executionRate} />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
