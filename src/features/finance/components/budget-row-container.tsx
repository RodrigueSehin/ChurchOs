import { getBudgetDetail } from "@/features/finance/queries";
import type { getBudgets } from "@/features/finance/queries";
import { BudgetRow } from "@/features/finance/components/budget-row";

type Budget = Awaited<ReturnType<typeof getBudgets>>[number];

export async function BudgetRowContainer({
  organizationId,
  budget,
  categories,
  funds,
  canManage,
  canApprove,
}: {
  organizationId: string;
  budget: Budget;
  categories: { id: string; name: string }[];
  funds: { id: string; name: string }[];
  canManage: boolean;
  canApprove: boolean;
}) {
  const detail = await getBudgetDetail(organizationId, budget.id);
  return (
    <BudgetRow
      budget={budget}
      lines={detail?.lines ?? []}
      categories={categories}
      funds={funds}
      canManage={canManage}
      canApprove={canApprove}
    />
  );
}
