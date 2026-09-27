import { PAYMENT_METHOD_LABELS } from "@/features/finance/schemas";
import { DeleteTransactionButton } from "@/features/finance/components/delete-transaction-button";
import type { getTransactions } from "@/features/finance/queries";

type Row = Awaited<ReturnType<typeof getTransactions>>["rows"][number];

function formatAmount(amount: string | number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency || "XOF", maximumFractionDigits: 0 }).format(Number(amount));
}

export function TransactionsTable({ rows, type, canDelete }: { rows: Row[]; type: "income" | "expense"; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Description</th>
            <th className="px-3 py-2.5 font-medium">Catégorie</th>
            <th className="px-3 py-2.5 font-medium">Fonds</th>
            <th className="px-3 py-2.5 font-medium text-right">Montant</th>
            {canDelete && <th className="px-3 py-2.5 font-medium"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3 text-slate-500">{row.transactionDate}</td>
              <td className="px-3 py-3 text-navy">
                {row.description ?? (row.donorFirstName ? `${row.donorFirstName} ${row.donorLastName}` : "—")}
                {row.paymentMethod && <p className="text-xs text-slate-400">{PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}</p>}
              </td>
              <td className="px-3 py-3 text-slate-500">{row.categoryName ?? "—"}</td>
              <td className="px-3 py-3 text-slate-500">{row.fundName ?? "—"}</td>
              <td className={`px-3 py-3 text-right font-medium ${type === "income" ? "text-success" : "text-danger"}`}>
                {type === "income" ? "+" : "-"}
                {formatAmount(row.amount, row.currency)}
              </td>
              {canDelete && (
                <td className="px-3 py-3 text-right">
                  <DeleteTransactionButton transactionId={row.id} type={type} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
