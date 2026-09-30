import { TRANSACTION_STATUS_LABELS } from "@/features/finance/schemas";

const STYLES: Record<string, string> = {
  validated: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-700",
};

const DOTS: Record<string, string> = {
  validated: "bg-green-500",
  pending: "bg-amber-500",
  rejected: "bg-red-500",
};

export function TransactionStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? "bg-slate-100 text-slate-600"}`}>
      <span className={`size-1.5 rounded-full ${DOTS[status] ?? "bg-slate-400"}`} />
      {TRANSACTION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
