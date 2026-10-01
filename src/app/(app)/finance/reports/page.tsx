import { HandCoins, PieChart as PieIcon, Scale, Wallet } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFinanceCategories, getFunds } from "@/features/finance/queries";
import { getRecentReportRuns, getReportData, normalizeParams } from "@/features/finance/reports/queries";
import { REPORT_FORMATS, REPORT_TYPES, type ReportFormat, type ReportType } from "@/features/finance/reports/types";
import { formatMoney } from "@/features/finance/format";
import { ReportsToolbar } from "@/features/finance/components/reports-toolbar";
import { ReportsMonthlyChart } from "@/features/finance/components/reports-monthly-chart";
import { DonationsCategoryDonut } from "@/features/finance/components/donations-category-donut";
import { ReportCategoryTable } from "@/features/finance/components/report-category-table";
import { QuickReports } from "@/features/finance/components/quick-reports";
import { RecentReportsCard } from "@/features/finance/components/recent-reports-card";

export default async function FinanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string; format?: string; category?: string; fund?: string }>;
}) {
  const hero = (
    <PageHero
      title="Rapports financiers"
      description="Suivez et analysez la situation financière de votre église."
      verseContext="finance"
    />
  );

  // Gated par `finance.view`, pas le `reports.view` générique : ce rapport agrège des montants
  // financiers, exactement ce que le critère de sortie de la Phase 9 ("permissions finance
  // strictement isolées") interdit d'exposer à des rôles qui ont `reports.view` sans avoir accès
  // aux finances (SECRETARY, MINISTRY_LEADER — voir ROLE_PERMISSIONS).
  const check = await checkPermission("finance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        {hero}
        <PermissionDenied requiredPermission="finance.view" />
      </div>
    );
  }

  const raw = await searchParams;
  const params = normalizeParams({ from: raw.from, to: raw.to, categoryId: raw.category, fundId: raw.fund });
  const type = (REPORT_TYPES as readonly string[]).includes(raw.type ?? "") ? (raw.type as ReportType) : "overview";
  const format = (REPORT_FORMATS as readonly string[]).includes(raw.format ?? "") ? (raw.format as ReportFormat) : "pdf";

  const organizationId = check.organization.organization.id;
  const currency = check.organization.organization.currency;
  const canExport = check.context.isAdmin || check.context.permissions.has("reports.export");

  const [data, categories, funds, runs] = await Promise.all([
    getReportData(organizationId, params),
    getFinanceCategories(organizationId),
    getFunds(organizationId),
    getRecentReportRuns(organizationId, 3),
  ]);
  const bare = (value: number) => formatMoney(value, currency).replace(" FCFA", "");
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;

  return (
    <div className="flex flex-col gap-6">
      {hero}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={HandCoins} iconClassName="bg-green-100 text-green-600" label="Total des revenus" value={bare(data.totals.revenue)} delta={data.deltas.revenue} periodLabel={`${unit} · vs période précédente`} />
        <KpiCard icon={Wallet} iconClassName="bg-red-100 text-red-600" label="Total des dépenses" value={bare(data.totals.expenses)} delta={data.deltas.expenses} deltaTone="inverse" periodLabel={`${unit} · vs période précédente`} />
        <KpiCard icon={Scale} iconClassName="bg-blue-100 text-blue-600" label="Solde de la période" value={bare(data.totals.balance)} delta={data.deltas.balance} periodLabel={`${unit} · vs période précédente`} />
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <PieIcon className="size-4.5" />
              </span>
              <p className="text-sm font-medium text-slate-500">Taux d&apos;exécution budget</p>
            </div>
            <p className="mt-2.5 text-2xl font-bold text-navy">{data.executionRate === null ? "—" : `${data.executionRate}%`}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(data.executionRate ?? 0, 100)}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {data.budgetPlanned > 0 ? `${bare(data.totals.expenses)} / ${bare(data.budgetPlanned)} ${unit}` : "Aucun budget sur la période"}
            </p>
          </CardContent>
        </Card>
      </div>

      <ReportsToolbar
        from={params.from}
        to={params.to}
        type={type}
        format={format}
        categoryId={params.categoryId ?? ""}
        fundId={params.fundId ?? ""}
        categories={categories}
        funds={funds}
        canExport={canExport}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportsMonthlyChart months={data.months} currency={currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationsCategoryDonut
              rows={data.categories.filter((c) => c.income > 0).map((c) => ({ categoryName: c.name, total: c.income }))}
              currency={currency}
              emptyLabel="Aucun revenu sur cette période."
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Détail par catégorie</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ReportCategoryTable data={data} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6">
          <QuickReports from={params.from} to={params.to} canExport={canExport} />
          <RecentReportsCard runs={runs} canExport={canExport} />
        </div>
      </div>
    </div>
  );
}
