import { Paperclip, Wallet } from "lucide-react";

import { pastelStyleFor } from "@/lib/color-hash";
import { formatMoney } from "@/features/finance/format";
import { PAYMENT_METHOD_LABELS } from "@/features/finance/schemas";
import { METHOD_ICONS } from "@/features/finance/components/donations-table";
import { TransactionStatusBadge } from "@/features/finance/components/transaction-status-badge";
import { DonationRowActions } from "@/features/finance/components/donation-row-actions";
import type { getTransactions } from "@/features/finance/queries";

type Row = Awaited<ReturnType<typeof getTransactions>>["rows"][number];

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function ExpensesTable({ rows, canDelete, canApprove }: { rows: Row[]; canDelete: boolean; canApprove: boolean }) {
  const showActions = canDelete || canApprove;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Libellé</th>
            <th className="px-3 py-2.5 font-medium">Catégorie</th>
            <th className="px-3 py-2.5 font-medium">Montant</th>
            <th className="px-3 py-2.5 font-medium">Fournisseur</th>
            <th className="px-3 py-2.5 font-medium">Mode de paiement</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label = row.title ?? row.description ?? row.categoryName ?? "Dépense";
            const MethodIcon = row.paymentMethod ? (METHOD_ICONS[row.paymentMethod] ?? Wallet) : null;
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-500">{formatDate(row.transactionDate)}</td>
                <td className="px-3 py-3 font-medium text-navy">
                  <span className="flex items-center gap-1.5">
                    {label}
                    {row.attachmentCount > 0 && <Paperclip className="size-3.5 text-slate-400" aria-label={`${row.attachmentCount} pièce(s) jointe(s)`} />}
                  </span>
                  {row.reference && <span className="block text-xs font-normal text-slate-400">{row.reference}</span>}
                </td>
                <td className="px-3 py-3">
                  {row.categoryName ? (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pastelStyleFor(row.categoryName).badge}`}>{row.categoryName}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3 font-medium text-navy">{formatMoney(row.amount, row.currency)}</td>
                <td className="px-3 py-3 text-slate-500">{row.vendorName ?? "—"}</td>
                <td className="px-3 py-3 text-slate-600">
                  {row.paymentMethod && MethodIcon ? (
                    <span className="flex items-center gap-1.5">
                      <MethodIcon className="size-4 text-slate-400" />
                      {PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <TransactionStatusBadge status={row.status} />
                </td>
                <td className="px-3 py-3">
                  {showActions || row.attachmentCount > 0 ? (
                    <DonationRowActions
                      transactionId={row.id}
                      label={label}
                      type="expense"
                      status={row.status}
                      attachmentCount={row.attachmentCount}
                      canApprove={canApprove}
                      canDelete={canDelete}
                    />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
