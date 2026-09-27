import { Receipt } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { getFinanceCategories, getFinancialAccounts, getFunds, getTransactions } from "@/features/finance/queries";
import { TransactionsTable } from "@/features/finance/components/transactions-table";
import { TransactionFormDialog } from "@/features/finance/components/transaction-form-dialog";
import { FinanceSetupManager } from "@/features/finance/components/finance-setup-manager";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const check = await checkPermission("finance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dépenses" description="Dépenses de votre église." />
        <PermissionDenied requiredPermission="finance.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("finance.create") || check.context.isAdmin;
  const canDelete = check.context.isAdmin;

  const [{ rows, total, pageSize }, categories, funds, accounts] = await Promise.all([
    getTransactions({ organizationId, type: "expense", page }),
    getFinanceCategories(organizationId, "expense"),
    getFunds(organizationId),
    getFinancialAccounts(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dépenses"
        description="Dépenses de votre église."
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <FinanceSetupManager categories={categories} funds={funds} accounts={accounts} />
              <TransactionFormDialog type="expense" categories={categories} funds={funds} accounts={accounts} people={[]} />
            </div>
          ) : undefined
        }
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="Aucune dépense" description="Enregistrez la première dépense de votre église." className="border-0" />
        ) : (
          <>
            <TransactionsTable rows={rows} type="expense" canDelete={canDelete} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => `/finance/expenses?page=${p}`}
            />
          </>
        )}
      </Card>
    </div>
  );
}
