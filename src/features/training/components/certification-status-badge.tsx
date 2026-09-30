import { CERTIFICATION_STATUS_LABELS } from "@/features/training/schemas";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  obtained: "bg-success/10 text-success",
  pending: "bg-amber-100 text-amber-700",
  expired: "bg-danger/10 text-danger",
};

export function CertificationStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", STYLES[status] ?? STYLES.obtained)}>
      {CERTIFICATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
