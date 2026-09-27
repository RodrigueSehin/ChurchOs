import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { InvoiceSummary } from "@/lib/payments";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  paid: "success",
  open: "warning",
  draft: "secondary",
  void: "secondary",
  uncollectible: "danger",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Payée",
  open: "En attente",
  draft: "Brouillon",
  void: "Annulée",
  uncollectible: "Impayée",
};

function formatAmount(cents: number, currency: string) {
  // Les devises "zero-decimal" chez Stripe (XOF en fait partie) n'ont pas de sous-unité — le
  // montant retourné par l'API est déjà l'unité entière, contrairement à USD/EUR (centimes).
  const zeroDecimal = ["xof", "xaf", "jpy", "krw"].includes(currency.toLowerCase());
  const amount = zeroDecimal ? cents : cents / 100;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 0 }).format(amount);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function InvoicesTable({ invoices }: { invoices: InvoiceSummary[] }) {
  if (invoices.length === 0) {
    return <EmptyState title="Aucune facture" description="Vos factures Stripe apparaîtront ici après votre premier paiement." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Numéro</th>
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Montant</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3 font-medium text-navy">{invoice.number ?? invoice.id}</td>
              <td className="px-3 py-3 text-slate-500">{formatDate(invoice.created)}</td>
              <td className="px-3 py-3 text-slate-500">{formatAmount(invoice.amountDue, invoice.currency)}</td>
              <td className="px-3 py-3">
                <Badge variant={STATUS_VARIANT[invoice.status] ?? "secondary"}>{STATUS_LABELS[invoice.status] ?? invoice.status}</Badge>
              </td>
              <td className="px-3 py-3 text-right">
                {invoice.hostedInvoiceUrl && (
                  <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    <ExternalLink className="size-4" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
