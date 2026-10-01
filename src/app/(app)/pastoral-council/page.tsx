import { CheckCircle2, ClipboardList, Gavel, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { getAssignableUsers, getPastoralCouncilKpis, getPastoralCouncils, getPastoralCouncilTabCounts } from "@/features/pastoral-council/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { CouncilFormDialog } from "@/features/pastoral-council/components/council-form-dialog";
import { CouncilCard } from "@/features/pastoral-council/components/council-card";
import { CouncilTabs } from "@/features/pastoral-council/components/council-tabs";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function PastoralCouncilPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const check = await checkPermission("pastoral_council.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Conseil pastoral"
          description="Accompagner avec sagesse, écouter avec amour, orienter selon la Parole de Dieu."
          verseContext="council"
        />
        <PermissionDenied requiredPermission="pastoral_council.view" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("pastoral_council.manage");

  const params = await searchParams;

  const [kpis, tabCounts, councils, people, assignableUsers] = await Promise.all([
    getPastoralCouncilKpis(organizationId),
    getPastoralCouncilTabCounts(organizationId, check.user.id),
    getPastoralCouncils(organizationId, params.view, check.user.id),
    getPeopleForSelect(organizationId),
    getAssignableUsers(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Conseil pastoral"
        description="Accompagner avec sagesse, écouter avec amour, orienter selon la Parole de Dieu."
        verseContext="council"
        cta={{ icon: Users, line1: "Conseiller. Écouter. Orienter.", line2: "Pour des vies transformées." }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Gavel}
          iconClassName="bg-blue-100 text-blue-600"
          label="Conseils enregistrés"
          value={n(kpis.total.value)}
          delta={kpis.total.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={ClipboardList}
          iconClassName="bg-amber-100 text-amber-600"
          label="Planifiés"
          value={n(kpis.planned.value)}
          delta={kpis.planned.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={CheckCircle2}
          iconClassName="bg-green-100 text-green-600"
          label="Tenus"
          value={n(kpis.held.value)}
          delta={kpis.held.deltaPct}
          periodLabel="vs mois dernier"
        />
        <KpiCard icon={Users} iconClassName="bg-pink-100 text-pink-600" label="Actions en attente" value={n(kpis.pendingActions)} periodLabel="tous conseils confondus" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CouncilTabs activeView={params.view ?? ""} counts={tabCounts} />
        {canManage && <CouncilFormDialog />}
      </div>

      {councils.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title="Aucune réunion"
          description="Planifiez la première réunion du conseil pastoral de votre église."
          action={canManage ? <CouncilFormDialog /> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {councils.map((council) => (
            <CouncilCard
              key={council.id}
              organizationId={organizationId}
              council={council}
              people={people}
              assignableUsers={assignableUsers}
              canManage={canManage}
              isAdmin={check.context.isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
