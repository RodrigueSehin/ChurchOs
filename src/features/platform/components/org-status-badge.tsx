import { Badge } from "@/components/ui/badge";

export const ORG_STATUS_LABELS: Record<string, string> = {
  trial: "Essai",
  active: "Active",
  suspended: "Suspendue",
  archived: "Archivée",
};

const VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  trial: "warning",
  active: "success",
  suspended: "danger",
  archived: "secondary",
};

export function OrgStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANT[status] ?? "secondary"}>{ORG_STATUS_LABELS[status] ?? status}</Badge>;
}
