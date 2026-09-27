import { HandCoins } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { getFinanceCategories, getFinancialAccounts, getFunds, getTransactions } from "@/features/finance/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { TransactionsTable } from "@/features/finance/components/transactions-table";
import { TransactionFormDialog } from "@/features/finance/components/transaction-form-dialog";
import { FinanceSetupManager } from "@/features/finance/components/finance-setup-manager";

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const check = await checkPermission("finance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dons & offrandes" description="Recettes de votre église." />
        <PermissionDenied requiredPermission="finance.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("finance.create") || check.context.isAdmin;
  const canDelete = check.context.isAdmin;

  const [{ rows, total, pageSize }, categories, funds, accounts, people] = await Promise.all([
    getTransactions({ organizationId, type: "income", page }),
    getFinanceCategories(organizationId, "income"),
    getFunds(organizationId),
    getFinancialAccounts(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dons & offrandes"
        description="Recettes de votre église."
        actions={
          canCreate ? (
            <div className="flex items-center gap-2">
              <FinanceSetupManager categories={categories} funds={funds} accounts={accounts} />
              <TransactionFormDialog type="income" categories={categories} funds={funds} accounts={accounts} people={people} />
            </div>
          ) : undefined
        }
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={HandCoins} title="Aucune recette" description="Enregistrez la première recette de votre église." className="border-0" />
        ) : (
          <>
            <TransactionsTable rows={rows} type="income" canDelete={canDelete} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => `/finance/income?page=${p}`}
            />
          </>
        )}
      </Card>
    </div>
  );
}
