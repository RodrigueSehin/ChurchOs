import { Banknote, Building2, CreditCard, Globe, Landmark, Smartphone, Wallet, type LucideIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { pastelStyleFor } from "@/lib/color-hash";
import { formatMoney } from "@/features/finance/format";
import { PAYMENT_METHOD_LABELS } from "@/features/finance/schemas";
import { DonationRowActions } from "@/features/finance/components/donation-row-actions";
import type { getTransactions } from "@/features/finance/queries";

type Row = Awaited<ReturnType<typeof getTransactions>>["rows"][number];

export const METHOD_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  bank_transfer: Landmark,
  card: CreditCard,
  mobile_money: Smartphone,
  check: Wallet,
  online: Globe,
  other: Building2,
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function DonationsTable({ rows, canDelete }: { rows: Row[]; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Donateur</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Montant</th>
            <th className="px-3 py-2.5 font-medium">Méthode</th>
            <th className="px-3 py-2.5 font-medium">Affectation</th>
            <th className="px-3 py-2.5 font-medium">Référence</th>
            {canDelete && <th className="w-12 px-3 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const donor = row.donorFirstName ? `${row.donorFirstName} ${row.donorLastName ?? ""}`.trim() : null;
            const name = donor ?? row.description ?? "Don anonyme";
            const MethodIcon = row.paymentMethod ? (METHOD_ICONS[row.paymentMethod] ?? Wallet) : null;
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-500">{formatDate(row.transactionDate)}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2.5 font-medium text-navy">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">{donor ? initialsOf(donor) : "?"}</AvatarFallback>
                    </Avatar>
                    {name}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {row.categoryName ? (
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${pastelStyleFor(row.categoryName).badge}`}>{row.categoryName}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-3 py-3 font-medium text-navy">{formatMoney(row.amount, row.currency)}</td>
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
                <td className="px-3 py-3 text-slate-500">{row.fundName ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{row.reference ?? "—"}</td>
                {canDelete && (
                  <td className="px-3 py-3">
                    <DonationRowActions transactionId={row.id} label={name} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
