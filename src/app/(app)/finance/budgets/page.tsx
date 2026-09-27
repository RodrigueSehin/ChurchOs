import { PiggyBank } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { getBudgets, getFinanceCategories, getFunds } from "@/features/finance/queries";
import { BudgetFormDialog } from "@/features/finance/components/budget-form-dialog";
import { BudgetRowContainer } from "@/features/finance/components/budget-row-container";

export default async function BudgetsPage() {
  const check = await checkPermission("finance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Budgets" description="Budgets annuels par exercice." />
        <PermissionDenied requiredPermission="finance.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canManage = check.context.permissions.has("finance.create") || check.context.isAdmin;
  const canApprove = check.context.permissions.has("finance.approve") || check.context.isAdmin;

  const [budgets, categories, funds] = await Promise.all([
    getBudgets(organizationId),
    getFinanceCategories(organizationId),
    getFunds(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Budgets"
        description="Budgets annuels par exercice — un budget passe de brouillon à actif après approbation."
        actions={canManage ? <BudgetFormDialog /> : undefined}
      />

      {budgets.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Aucun budget" description="Créez le premier budget de votre église." />
      ) : (
        <div className="flex flex-col gap-3">
          {budgets.map((budget) => (
            <BudgetRowContainer
              key={budget.id}
              organizationId={organizationId}
              budget={budget}
              categories={categories}
              funds={funds}
              canManage={canManage}
              canApprove={canApprove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
