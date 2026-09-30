import { CalendarCheck, PiggyBank, PieChart, Wallet } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBudgetByCategory,
  getBudgetKpis,
  getBudgetLinesByBudget,
  getBudgetTabCounts,
  getBudgetYears,
  getBudgetsOverview,
  getFinanceCategories,
  getFunds,
  getRecentBudgets,
} from "@/features/finance/queries";
import { formatMoney } from "@/features/finance/format";
import { BudgetFormDialog } from "@/features/finance/components/budget-form-dialog";
import { BudgetsTable } from "@/features/finance/components/budgets-table";
import { BudgetsTabs } from "@/features/finance/components/budgets-tabs";
import { BudgetsFilters } from "@/features/finance/components/budgets-filters";
import { BudgetsExecutionChart } from "@/features/finance/components/budgets-execution-chart";
import { DonationsCategoryDonut } from "@/features/finance/components/donations-category-donut";
import { RecentBudgetsCard } from "@/features/finance/components/recent-budgets-card";

const DONUT_COLORS = ["#2563EB", "#F59E0B", "#9333EA", "#EF4444", "#14B8A6", "#94A3B8"];

function ProgressKpi({
  icon: Icon,
  iconClassName,
  barColor,
  label,
  value,
  pct,
}: {
  icon: React.ElementType;
  iconClassName: string;
  barColor: string;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2.5">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
            <Icon className="size-4.5" />
          </span>
          <p className="text-sm font-medium text-slate-500">{label}</p>
        </div>
        <p className="mt-2.5 text-2xl font-bold text-navy">{value}</p>
        <p className="mt-1 text-xs text-slate-500">
          <span className="text-sm font-semibold text-navy">{pct}%</span> du budget total
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; year?: string; page?: string }>;
}) {
  const hero = (
    <PageHero
      title="Budgets"
      description="Planifiez, suivez et maîtrisez les budgets de votre église."
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
  const canManage = check.context.permissions.has("finance.create") || check.context.isAdmin;
  const canApprove = check.context.permissions.has("finance.approve") || check.context.isAdmin;

  // Exercice affiché : celui du paramètre, sinon l'année en cours, sinon le plus récent existant.
  const years = await getBudgetYears(organizationId);
  const currentYear = new Date().getUTCFullYear();
  const requestedYear = Number(params.year);
  const year = years.includes(requestedYear) ? requestedYear : years.includes(currentYear) || years.length === 0 ? currentYear : years[0]!;

  const [kpis, byCategory, categories, funds, tabCounts, recent, { rows, total, pageSize }] = await Promise.all([
    getBudgetKpis(organizationId, year),
    getBudgetByCategory(organizationId, year),
    getFinanceCategories(organizationId),
    getFunds(organizationId),
    getBudgetTabCounts(organizationId, year),
    getRecentBudgets(organizationId, 4),
    getBudgetsOverview({ organizationId, year, status: params.status, search: params.q, page }),
  ]);
  const linesByBudget = await getBudgetLinesByBudget(rows.map((r) => r.id));

  const hasFilters = Boolean(params.q || params.status);
  const newBudget = canManage ? <BudgetFormDialog /> : undefined;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const bare = (value: number) => formatMoney(value, currency).replace(" FCFA", "");

  return (
    <div className="flex flex-col gap-6">
      {hero}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Wallet}
          iconClassName="bg-orange-100 text-orange-600"
          label="Budget total annuel"
          value={bare(kpis.planned.value)}
          delta={kpis.planned.deltaPct}
          periodLabel="vs exercice précédent"
        />
        <ProgressKpi icon={PieChart} iconClassName="bg-blue-100 text-blue-600" barColor="#2563EB" label="Montant engagé" value={bare(kpis.actual.value)} pct={kpis.actual.pctOfPlanned} />
        <ProgressKpi icon={PiggyBank} iconClassName="bg-amber-100 text-amber-600" barColor="#F59E0B" label="Reste à engager" value={bare(kpis.remaining.value)} pct={kpis.remaining.pctOfPlanned} />
        <KpiCard
          icon={CalendarCheck}
          iconClassName="bg-red-100 text-red-600"
          label="Budgets actifs"
          value={String(kpis.active.value)}
          delta={kpis.active.delta}
          deltaSuffix=""
          periodLabel="vs exercice précédent"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Exécution des budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetsExecutionChart rows={byCategory} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition du budget par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationsCategoryDonut
              rows={byCategory.map((r) => ({ categoryName: r.categoryName, total: r.planned }))}
              currency={currency}
              colors={DONUT_COLORS}
              maxSlices={5}
              emptyLabel="Aucune ligne budgétaire sur cet exercice."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <BudgetsTabs activeStatus={params.status ?? ""} counts={tabCounts} />
            {newBudget}
          </div>

          <BudgetsFilters initialSearch={params.q ?? ""} year={year} years={years} />

          <Card>
            {rows.length === 0 ? (
              hasFilters ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={PiggyBank} title="Aucun budget" description={`Aucun budget pour l'exercice ${year}. Créez-en un pour commencer.`} action={newBudget} className="border-0" />
              )
            ) : (
              <>
                <BudgetsTable rows={rows} linesByBudget={linesByBudget} categories={categories} funds={funds} canManage={canManage} canApprove={canApprove} />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (params.status) sp.set("status", params.status);
                    if (params.year) sp.set("year", params.year);
                    sp.set("page", String(p));
                    return `/finance/budgets?${sp.toString()}`;
                  }}
                />
                <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                  Affichage de {from} à {to} sur {total} budget{total > 1 ? "s" : ""}
                </p>
              </>
            )}
          </Card>
        </div>

        <RecentBudgetsCard rows={recent} currency={currency} />
      </div>
    </div>
  );
}
