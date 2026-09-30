import { FileText, PieChart, Receipt, TrendingUp, Wallet } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getActiveBudgetProgress,
  getCategoryCounts,
  getFinanceCategories,
  getFinancialAccounts,
  getFunds,
  getMonthlyTotals,
  getRecentTransactions,
  getTransactionKpis,
  getTransactions,
  getVendorNames,
} from "@/features/finance/queries";
import { getCampuses } from "@/features/organizations/queries";
import { formatMoney } from "@/features/finance/format";
import { ExpensesTable } from "@/features/finance/components/expenses-table";
import { DonationsTabs } from "@/features/finance/components/donations-tabs";
import { DonationsFilters } from "@/features/finance/components/donations-filters";
import { DonationsMonthlyChart } from "@/features/finance/components/donations-monthly-chart";
import { DonationsCategoryDonut } from "@/features/finance/components/donations-category-donut";
import { RecentExpensesCard } from "@/features/finance/components/recent-expenses-card";
import { BudgetProgressCard } from "@/features/finance/components/budget-progress-card";
import { ExpenseFormDialog } from "@/features/finance/components/expense-form-dialog";
import { FinanceSetupManager } from "@/features/finance/components/finance-setup-manager";

const EXPENSE_BAR_COLORS = ["#F43F5E"];
const EXPENSE_DONUT_COLORS = ["#2563EB", "#F59E0B", "#6366F1", "#EF4444", "#9333EA", "#94A3B8"];

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

type SearchParams = {
  q?: string;
  category?: string;
  method?: string;
  fund?: string;
  from?: string;
  to?: string;
  year?: string;
  page?: string;
};

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const hero = (
    <PageHero
      title="Dépenses"
      description="Gérez les dépenses de votre église avec transparence et efficacité."
      quote="Que tout se fasse avec bienséance et avec ordre."
      verseRef="1 Corinthiens 14:40"
    />
  );

  const check = await checkPermission("finance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        {hero}
        <PermissionDenied requiredPermission="finance.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const currency = check.organization.organization.currency;
  const canCreate = check.context.permissions.has("finance.create") || check.context.isAdmin;
  const canDelete = check.context.isAdmin;
  const canApprove = check.context.isAdmin || check.context.permissions.has("finance.approve");

  const currentYear = new Date().getUTCFullYear();
  const year = Number(params.year) === currentYear - 1 ? currentYear - 1 : currentYear;

  const [kpis, monthly, categories, funds, accounts, tabCounts, recent, budgetProgress, campuses, vendors] = await Promise.all([
    getTransactionKpis(organizationId, "expense"),
    getMonthlyTotals(organizationId, "expense", year),
    getFinanceCategories(organizationId, "expense"),
    getFunds(organizationId),
    getFinancialAccounts(organizationId),
    getCategoryCounts(organizationId, "expense"),
    getRecentTransactions(organizationId, "expense", 5),
    getActiveBudgetProgress(organizationId),
    getCampuses(organizationId),
    getVendorNames(organizationId),
  ]);
  const topLevelCategories = categories.filter((c) => !c.parentId);

  const { rows, total, pageSize } = await getTransactions({
    organizationId,
    type: "expense",
    page,
    search: params.q,
    categoryId: params.category,
    fundId: params.fund,
    paymentMethod: params.method,
    from: params.from,
    to: params.to,
  });

  const hasFilters = Boolean(params.q || params.category || params.fund || params.method || params.from || params.to);
  const newExpense = canCreate ? (
    <ExpenseFormDialog categories={categories} funds={funds} accounts={accounts} campuses={campuses} vendors={vendors} currency={currency} />
  ) : undefined;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const bareMoney = (value: number) => formatMoney(value, currency).replace(" FCFA", "");

  // Une seule série (toutes catégories confondues) pour les barres, comme sur la maquette.
  const monthlyAll = monthly.map((r) => ({ ...r, categoryName: "Dépenses" }));

  return (
    <div className="flex flex-col gap-6">
      {hero}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          iconClassName="bg-red-100 text-red-600"
          label="Total des dépenses ce mois"
          value={bareMoney(kpis.monthTotal.value)}
          delta={kpis.monthTotal.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Receipt}
          iconClassName="bg-green-100 text-green-600"
          label="Total des dépenses cette année"
          value={bareMoney(kpis.yearTotal.value)}
          delta={kpis.yearTotal.deltaPct}
          periodLabel="vs année précédente"
        />
        <KpiCard
          icon={FileText}
          iconClassName="bg-blue-100 text-blue-600"
          label="Nombre de dépenses"
          value={n(kpis.monthCount.value)}
          delta={kpis.monthCount.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={PieChart}
          iconClassName="bg-amber-100 text-amber-600"
          label="Dépense moyenne"
          value={bareMoney(kpis.average.value)}
          delta={kpis.average.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationsMonthlyChart
              rows={monthlyAll}
              year={year}
              currentYear={currentYear}
              currency={currency}
              colors={EXPENSE_BAR_COLORS}
              maxSeries={1}
              emptyLabel="Aucune dépense enregistrée sur cette période."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationsCategoryDonut
              rows={monthly}
              currency={currency}
              colors={EXPENSE_DONUT_COLORS}
              maxSlices={5}
              emptyLabel="Aucune dépense enregistrée sur cette période."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <DonationsTabs activeCategoryId={params.category ?? ""} categories={topLevelCategories} counts={tabCounts} allLabel="Toutes" />
            <div className="flex items-center gap-2">
              {canCreate && <FinanceSetupManager categories={categories} funds={funds} accounts={accounts} />}
              {newExpense}
            </div>
          </div>

          <DonationsFilters
            initialSearch={params.q ?? ""}
            initialFrom={params.from ?? ""}
            initialTo={params.to ?? ""}
            initialMethod={params.method ?? ""}
            initialFundId={params.fund ?? ""}
            funds={funds}
            searchPlaceholder="Rechercher une dépense, une référence..."
          />

          <Card>
            {rows.length === 0 ? (
              hasFilters ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={TrendingUp} title="Aucune dépense" description="Enregistrez la première dépense de votre église." action={newExpense} className="border-0" />
              )
            ) : (
              <>
                <ExpensesTable rows={rows} canDelete={canDelete} canApprove={canApprove} />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    for (const key of ["q", "category", "method", "fund", "from", "to", "year"] as const) {
                      if (params[key]) sp.set(key, params[key]!);
                    }
                    sp.set("page", String(p));
                    return `/finance/expenses?${sp.toString()}`;
                  }}
                />
                <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                  Affichage de {from} à {to} sur {total} dépense{total > 1 ? "s" : ""}
                </p>
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <RecentExpensesCard rows={recent} />
          <BudgetProgressCard progress={budgetProgress} />
        </div>
      </div>
    </div>
  );
}
