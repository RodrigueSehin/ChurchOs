import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FINANCE_TYPE_LABELS } from "@/features/finance/schemas";
import type { getFinanceReport } from "@/features/finance/queries";

function formatAmount(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
}

export function FinanceReport({ report }: { report: Awaited<ReturnType<typeof getFinanceReport>> }) {
  const incomeRows = report.rows.filter((r) => r.type === "income");
  const expenseRows = report.rows.filter((r) => r.type === "expense");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-400">Total recettes</p>
            <p className="text-xl font-semibold text-success">{formatAmount(report.totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-400">Total dépenses</p>
            <p className="text-xl font-semibold text-danger">{formatAmount(report.totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs text-slate-400">Solde net</p>
            <p className={`text-xl font-semibold ${report.net >= 0 ? "text-success" : "text-danger"}`}>{formatAmount(report.net)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{FINANCE_TYPE_LABELS.income} par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeRows.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune recette sur cette période.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {incomeRows.map((r, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-navy">{r.categoryName ?? "Sans catégorie"}</span>
                    <span className="font-medium text-success">{formatAmount(Number(r.total ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{FINANCE_TYPE_LABELS.expense} par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseRows.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune dépense sur cette période.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {expenseRows.map((r, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-navy">{r.categoryName ?? "Sans catégorie"}</span>
                    <span className="font-medium text-danger">{formatAmount(Number(r.total ?? 0))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
