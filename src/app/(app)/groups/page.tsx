import { HeartHandshake, Home, UsersRound, UserCog, Sparkles } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { getGroups, getGroupsKpis, getGroupsTypeTabCounts } from "@/features/groups/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { createGroup } from "@/features/groups/actions";
import { GroupsTable } from "@/features/groups/components/groups-table";
import { GroupsFilters } from "@/features/groups/components/groups-filters";
import { GroupsTabs } from "@/features/groups/components/groups-tabs";
import { GroupFormDialog } from "@/features/groups/components/group-form-dialog";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; isActive?: string; meetingDay?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Groupes"
          description="Organisez vos groupes, équipes et cellules pour une communauté plus forte et engagée."
          verseContext="groups"
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

  const [kpis, tabCounts, peopleForSelect] = await Promise.all([
    getGroupsKpis(organizationId),
    getGroupsTypeTabCounts(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
  ]);

  const { rows, total, pageSize } = await getGroups({
    organizationId,
    search: params.q,
    type: params.type,
    isActive: params.isActive,
    meetingDay: params.meetingDay,
    page,
  });

  const hasFilters = Boolean(params.q || params.type || params.isActive || params.meetingDay);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Groupes"
        description="Organisez vos groupes, équipes et cellules pour une communauté plus forte et engagée."
        verseContext="groups"
        cta={{ icon: HeartHandshake, line1: "Des groupes vivants", line2: "pour des vies transformées." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={UsersRound}
          iconClassName="bg-purple-100 text-purple-600"
          label="Groupes"
          value={n(kpis.groups.value)}
          delta={kpis.groups.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={UsersRound}
          iconClassName="bg-green-100 text-green-600"
          label="Membres dans les groupes"
          value={n(kpis.members.value)}
          delta={kpis.members.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard icon={Sparkles} iconClassName="bg-blue-100 text-blue-600" label="Nouveaux groupes" value={n(kpis.newThisMonth)} periodLabel="ce mois-ci" />
        <KpiCard
          icon={UserCog}
          iconClassName="bg-amber-100 text-amber-600"
          label="Responsables"
          value={n(kpis.leaders.value)}
          delta={kpis.leaders.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Home}
          iconClassName="bg-pink-100 text-pink-600"
          label="Cellules de maison"
          value={n(kpis.homeGroups.value)}
          delta={kpis.homeGroups.deltaPct}
          periodLabel="vs mois dernier"
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <GroupsTabs activeType={params.type ?? ""} counts={tabCounts} />
        {canCreate && <GroupFormDialog action={createGroup} people={peopleForSelect} />}
      </div>

      <GroupsFilters
        initialSearch={params.q ?? ""}
        initialType={params.type ?? ""}
        initialIsActive={params.isActive ?? ""}
        initialMeetingDay={params.meetingDay ?? ""}
      />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={UsersRound} title="Aucun groupe" description="Créez le premier groupe de votre église." className="border-0" />
          )
        ) : (
          <>
            <GroupsTable rows={rows} canDelete={canDelete} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.type) sp.set("type", params.type);
                if (params.isActive) sp.set("isActive", params.isActive);
                if (params.meetingDay) sp.set("meetingDay", params.meetingDay);
                sp.set("page", String(p));
                return `/groups?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
