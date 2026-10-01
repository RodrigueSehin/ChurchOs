import { HeartHandshake, UserPlus, Users, UsersRound } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { getFamilies, getFamiliesKpi, getFamiliesMemberKpis, getFamiliesTabCounts, getFamilyCities } from "@/features/families/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { getMinistriesForSelect } from "@/features/ministries/services";
import { createFamily } from "@/features/families/actions";
import { FamiliesTable } from "@/features/families/components/families-table";
import { FamiliesFilters } from "@/features/families/components/families-filters";
import { FamiliesTabs } from "@/features/families/components/families-tabs";
import { FamilyFormDialog } from "@/features/families/components/family-form-dialog";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function FamiliesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; city?: string; size?: string; ministryId?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Familles"
          description="Regroupez les membres par familles pour une meilleure communion et un suivi pastoral efficace."
          verseContext="families"
        />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canCreate = check.context.permissions.has("members.create") || check.context.isAdmin;
  const canDelete = check.context.isAdmin;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [familiesKpi, memberKpis, tabCounts, cities, ministries, peopleForSelect] = await Promise.all([
    getFamiliesKpi(organizationId),
    getFamiliesMemberKpis(organizationId),
    getFamiliesTabCounts(organizationId),
    getFamilyCities(organizationId),
    getMinistriesForSelect(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  const { rows, total, pageSize } = await getFamilies({
    organizationId,
    search: params.q,
    view: params.view,
    city: params.city,
    size: params.size,
    ministryId: params.ministryId,
    page,
  });

  const hasFilters = Boolean(params.q || params.view || params.city || params.size || params.ministryId);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Familles"
        description="Regroupez les membres par familles pour une meilleure communion et un suivi pastoral efficace."
        verseContext="families"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={UsersRound}
          iconClassName="bg-purple-100 text-purple-600"
          label="Familles"
          value={n(familiesKpi.value)}
          delta={familiesKpi.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600"
          label="Membres"
          value={n(memberKpis.members)}
          delta={memberKpis.membersDeltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard icon={Users} iconClassName="bg-green-100 text-green-600" label="Adultes" value={n(memberKpis.adults)} periodLabel="rattachés à une famille" />
        <KpiCard icon={UserPlus} iconClassName="bg-sky-100 text-sky-600" label="Enfants" value={n(memberKpis.children)} periodLabel="rattachés à une famille" />
        <KpiCard
          icon={HeartHandshake}
          iconClassName="bg-pink-100 text-pink-600"
          label="Nouvelles familles"
          value={n(memberKpis.newFamilies)}
          periodLabel="ce mois-ci"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <FamiliesTabs activeView={params.view ?? ""} counts={tabCounts} />
        {canCreate && <FamilyFormDialog action={createFamily} people={peopleForSelect} />}
      </div>

      <FamiliesFilters
        initialSearch={params.q ?? ""}
        initialCity={params.city ?? ""}
        initialSize={params.size ?? ""}
        initialMinistryId={params.ministryId ?? ""}
        cities={cities}
        ministries={ministries}
      />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={Users} title="Aucune famille" description="Créez la première famille de votre église." className="border-0" />
          )
        ) : (
          <>
            <FamiliesTable rows={rows} canDelete={canDelete} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.view) sp.set("view", params.view);
                if (params.city) sp.set("city", params.city);
                if (params.size) sp.set("size", params.size);
                if (params.ministryId) sp.set("ministryId", params.ministryId);
                sp.set("page", String(p));
                return `/families?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
