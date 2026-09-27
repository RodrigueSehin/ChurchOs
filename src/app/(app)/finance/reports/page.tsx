import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getFinanceReport } from "@/features/finance/queries";
import { DateRangeFilter } from "@/features/finance/components/date-range-filter";
import { FinanceReport } from "@/features/finance/components/finance-report";

export default async function FinanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  // Gated par `finance.view`, pas le `reports.view` générique : ce rapport agrège des montants
  // financiers, exactement ce que le critère de sortie de cette phase ("permissions finance
  // strictement isolées") interdit d'exposer à des rôles qui ont `reports.view` sans avoir accès
  // aux finances (SECRETARY, MINISTRY_LEADER — voir ROLE_PERMISSIONS).
  const check = await checkPermission("finance.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Rapports financiers" description="Recettes et dépenses agrégées par catégorie." />
        <PermissionDenied requiredPermission="finance.view" />
      </div>
    );
  }

  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const from = params.from ?? `${currentYear}-01-01`;
  const to = params.to ?? `${currentYear}-12-31`;

  const report = await getFinanceReport({ organizationId: check.organization.organization.id, from, to });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Rapports financiers" description="Recettes et dépenses agrégées par catégorie." />
      <DateRangeFilter from={from} to={to} />
      <FinanceReport report={report} />
    </div>
  );
}
