import Link from "next/link";
import { CalendarCheck, HeartHandshake, Plus, UserPlus, Users, UsersRound } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getActiveEngagedMembersCount,
  getMembers,
  getMemberTabCounts,
  getMembersKpi,
  getNewMembersThisMonthCount,
} from "@/features/members/queries";
import { getFamiliesKpi } from "@/features/families/services";
import { getVisitorsKpi } from "@/features/visitors/services";
import { getMinistriesForSelect } from "@/features/ministries/services";
import { MembersTable } from "@/features/members/components/members-table";
import { MembersFilters } from "@/features/members/components/members-filters";
import { MembersTabs } from "@/features/members/components/members-tabs";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; ministryId?: string; ageGroup?: string; gender?: string; page?: string }>;
}) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Membres"
          description="Gérez vos membres, familles, visiteurs et groupes."
          quote="Vous êtes tous membres les uns des autres."
          verseRef="Éphésiens 4:25"
        />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const perms = check.context.permissions;
  const canCreate = perms.has("members.create");
  const canUpdate = perms.has("members.update");
  const canDelete = perms.has("members.delete");
  const canAttendance = perms.has("attendance.view");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const [membersKpi, familiesKpi, visitorsKpi, newThisMonth, activeEngaged, tabCounts, ministries] = await Promise.all([
    getMembersKpi(organizationId),
    getFamiliesKpi(organizationId),
    getVisitorsKpi(organizationId),
    getNewMembersThisMonthCount(organizationId),
    canAttendance ? getActiveEngagedMembersCount(organizationId) : Promise.resolve(null),
    getMemberTabCounts(organizationId),
    getMinistriesForSelect(organizationId),
  ]);

  const { rows, total, pageSize } = await getMembers({
    organizationId,
    search: params.q,
    status: params.status,
    ministryId: params.ministryId,
    ageGroup: params.ageGroup,
    gender: params.gender,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.ministryId || params.ageGroup || params.gender);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Membres"
        description="Gérez vos membres, familles, visiteurs et groupes. Une communauté plus connectée pour un plus grand impact."
        quote="Vous êtes tous membres les uns des autres."
        verseRef="Éphésiens 4:25"
        cta={{ icon: HeartHandshake, line1: "Bâtir une communauté", line2: "qui fait la différence." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={Users}
          iconClassName="bg-blue-100 text-blue-600"
          label="Membres"
          value={n(membersKpi.value)}
          delta={membersKpi.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={UsersRound}
          iconClassName="bg-purple-100 text-purple-600"
          label="Familles"
          value={n(familiesKpi.value)}
          delta={familiesKpi.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={UserPlus}
          iconClassName="bg-green-100 text-green-600"
          label="Visiteurs"
          value={n(visitorsKpi.value)}
          delta={visitorsKpi.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={UserPlus}
          iconClassName="bg-blue-100 text-blue-600"
          label="Nouveaux membres"
          value={n(newThisMonth)}
          periodLabel="ce mois-ci"
        />
        {activeEngaged !== null && (
          <KpiCard
            icon={CalendarCheck}
            iconClassName="bg-pink-100 text-pink-600"
            label="Membres actifs"
            value={n(activeEngaged)}
            periodLabel="présents ces 30 derniers jours"
          />
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <MembersTabs activeStatus={params.status ?? ""} counts={tabCounts} />
        {canCreate && (
          <Button asChild>
            <Link href="/members/new">
              <Plus className="size-4" />
              Ajouter un membre
            </Link>
          </Button>
        )}
      </div>

      <MembersFilters
        initialSearch={params.q ?? ""}
        initialStatus={params.status ?? ""}
        initialMinistryId={params.ministryId ?? ""}
        initialAgeGroup={params.ageGroup ?? ""}
        initialGender={params.gender ?? ""}
        ministries={ministries}
      />

      <Card>
        {rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState
              icon={Users}
              title="Aucun membre"
              description="Commencez par ajouter le premier membre de votre église."
              action={
                canCreate ? (
                  <Button asChild>
                    <Link href="/members/new">
                      <Plus className="size-4" />
                      Nouveau membre
                    </Link>
                  </Button>
                ) : undefined
              }
              className="border-0"
            />
          )
        ) : (
          <>
            <MembersTable rows={rows} canUpdate={canUpdate} canDelete={canDelete} />
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (params.status) sp.set("status", params.status);
                if (params.ministryId) sp.set("ministryId", params.ministryId);
                if (params.ageGroup) sp.set("ageGroup", params.ageGroup);
                if (params.gender) sp.set("gender", params.gender);
                sp.set("page", String(p));
                return `/members?${sp.toString()}`;
              }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
