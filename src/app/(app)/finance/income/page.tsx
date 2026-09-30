import { Gift, HandCoins, HeartHandshake, TrendingUp, Users, Wallet } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCategoryCounts,
  getTransactionKpis,
  getMonthlyTotals,
  getFinanceCategories,
  getFinancialAccounts,
  getFunds,
  getTransactions,
} from "@/features/finance/queries";
import { formatMoney } from "@/features/finance/format";
import { getPeopleForSelect } from "@/features/members/services";
import { DonationsTable } from "@/features/finance/components/donations-table";
import { DonationsTabs } from "@/features/finance/components/donations-tabs";
import { DonationsFilters } from "@/features/finance/components/donations-filters";
import { DonationsMonthlyChart } from "@/features/finance/components/donations-monthly-chart";
import { DonationsCategoryDonut } from "@/features/finance/components/donations-category-donut";
import { TransactionFormDialog } from "@/features/finance/components/transaction-form-dialog";
import { FinanceSetupManager } from "@/features/finance/components/finance-setup-manager";

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

export default async function IncomePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const hero = (
    <PageHero
      title="Dons & offrandes"
      description="Gérez les dons, offrandes et contributions de votre église."
      quote="Chacun donne comme il l'a décidé dans son cœur, sans regret et sans contrainte, car Dieu aime celui qui donne avec joie."
      verseRef="2 Corinthiens 9:7"
      cta={{ icon: Gift, line1: "Un peuple qui donne,", line2: "une œuvre qui avance." }}
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

  const currentYear = new Date().getUTCFullYear();
  const year = Number(params.year) === currentYear - 1 ? currentYear - 1 : currentYear;

  const [kpis, monthly, categories, funds, accounts, people, tabCounts] = await Promise.all([
    getTransactionKpis(organizationId, "income"),
    getMonthlyTotals(organizationId, "income", year),
    getFinanceCategories(organizationId, "income"),
    getFunds(organizationId),
    getFinancialAccounts(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    getCategoryCounts(organizationId, "income"),
  ]);

  const { rows, total, pageSize } = await getTransactions({
    organizationId,
    type: "income",
    page,
    search: params.q,
    categoryId: params.category,
    fundId: params.fund,
    paymentMethod: params.method,
    from: params.from,
    to: params.to,
  });

  const hasFilters = Boolean(params.q || params.category || params.fund || params.method || params.from || params.to);
  const newDonation = canCreate ? (
    <TransactionFormDialog type="income" triggerLabel="Nouveau don" categories={categories} funds={funds} accounts={accounts} people={people} />
  ) : undefined;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-6">
      {hero}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={HeartHandshake}
          iconClassName="bg-green-100 text-green-600"
          label="Total des dons ce mois"
          value={formatMoney(kpis.monthTotal.value, currency).replace(" FCFA", "")}
          delta={kpis.monthTotal.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600"
          label="Donateurs actifs"
          value={n(kpis.activeDonors.value)}
          delta={kpis.activeDonors.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Wallet}
          iconClassName="bg-purple-100 text-purple-600"
          label="Total annuel"
          value={formatMoney(kpis.yearTotal.value, currency).replace(" FCFA", "")}
          delta={kpis.yearTotal.deltaPct}
          periodLabel="vs année précédente"
        />
        <KpiCard
          icon={TrendingUp}
          iconClassName="bg-amber-100 text-amber-600"
          label="Don moyen"
          value={formatMoney(kpis.average.value, currency).replace(" FCFA", "")}
          delta={kpis.average.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Évolution des dons</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationsMonthlyChart rows={monthly} year={year} currentYear={currentYear} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition par type</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationsCategoryDonut rows={monthly} currency={currency} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <DonationsTabs activeCategoryId={params.category ?? ""} categories={categories.filter((c) => !c.parentId)} counts={tabCounts} />
          <div className="flex items-center gap-2">
            {canCreate && <FinanceSetupManager categories={categories} funds={funds} accounts={accounts} />}
            {newDonation}
          </div>
        </div>

        <DonationsFilters
          initialSearch={params.q ?? ""}
          initialFrom={params.from ?? ""}
          initialTo={params.to ?? ""}
          initialMethod={params.method ?? ""}
          initialFundId={params.fund ?? ""}
          funds={funds}
        />

        <Card>
          {rows.length === 0 ? (
            hasFilters ? (
              <NoResultsState className="border-0" />
            ) : (
              <EmptyState icon={HandCoins} title="Aucun don" description="Enregistrez le premier don de votre église." action={newDonation} className="border-0" />
            )
          ) : (
            <>
              <DonationsTable rows={rows} canDelete={canDelete} />
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
                  return `/finance/income?${sp.toString()}`;
                }}
              />
              <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                Affichage de {from} à {to} sur {total} don{total > 1 ? "s" : ""}
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
