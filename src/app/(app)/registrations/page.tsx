import Link from "next/link";
import { ClipboardList, ClockAlert, Send, TicketCheck, XCircle } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getRegistrations,
  getRegistrationsByEvent,
  getRegistrationsKpis,
  getRegistrationsStatusBreakdown,
  getRegistrationsTabCounts,
} from "@/features/registrations/queries";
import { getEventsForSelect } from "@/features/events/services";
import { getPeopleForSelect } from "@/features/members/services";
import { RegistrationsTable } from "@/features/registrations/components/registrations-table";
import { RegistrationsFilters } from "@/features/registrations/components/registrations-filters";
import { RegistrationsTabs } from "@/features/registrations/components/registrations-tabs";
import { RegistrationFormDialog } from "@/features/registrations/components/registration-form-dialog";
import { RegistrationsByEventBars } from "@/features/registrations/components/registrations-by-event-bars";
import { RegistrationStatusDonut } from "@/features/registrations/components/registration-status-donut";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; eventId?: string; participantType?: string; page?: string }>;
}) {
  const check = await checkPermission("registrations.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero
          title="Inscriptions"
          description="Gérez les inscriptions à vos événements et suivez la participation."
          quote="Que tout se fasse avec bienséance et avec ordre."
          verseRef="1 Corinthiens 14:40"
        />
        <PermissionDenied requiredPermission="registrations.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const organizationId = check.organization.organization.id;
  const canCreate = check.context.isAdmin || check.context.permissions.has("registrations.create");
  const canUpdate = check.context.isAdmin || check.context.permissions.has("registrations.update");
  const canDelete = check.context.isAdmin;

  const [kpis, tabCounts, events, people, byEvent, statusBreakdown] = await Promise.all([
    getRegistrationsKpis(organizationId),
    getRegistrationsTabCounts(organizationId),
    getEventsForSelect(organizationId),
    canCreate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    getRegistrationsByEvent(organizationId),
    getRegistrationsStatusBreakdown(organizationId),
  ]);

  const { rows, total, pageSize } = await getRegistrations({
    organizationId,
    search: params.q,
    status: params.status,
    eventId: params.eventId,
    participantType: params.participantType,
    page,
  });

  const hasFilters = Boolean(params.q || params.status || params.eventId || params.participantType);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Inscriptions"
        description="Gérez les inscriptions à vos événements et suivez la participation."
        quote="Que tout se fasse avec bienséance et avec ordre."
        verseRef="1 Corinthiens 14:40"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ClipboardList}
          iconClassName="bg-blue-100 text-blue-600"
          label="Inscriptions totales"
          value={n(kpis.total.value)}
          delta={kpis.total.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={TicketCheck}
          iconClassName="bg-green-100 text-green-600"
          label="Confirmées"
          value={n(kpis.confirmed.value)}
          delta={kpis.confirmed.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={ClockAlert}
          iconClassName="bg-amber-100 text-amber-600"
          label="En attente"
          value={n(kpis.pending.value)}
          delta={kpis.pending.deltaPct}
          periodLabel="vs année dernière"
        />
        <KpiCard
          icon={XCircle}
          iconClassName="bg-red-100 text-red-600"
          label="Annulées"
          value={n(kpis.cancelled.value)}
          delta={kpis.cancelled.deltaPct}
          periodLabel="vs année dernière"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <RegistrationsTabs activeStatus={params.status ?? ""} counts={tabCounts} />
            {canCreate && <RegistrationFormDialog events={events} people={people} defaultEventId={params.eventId} />}
          </div>

          <RegistrationsFilters
            initialSearch={params.q ?? ""}
            initialEventId={params.eventId ?? ""}
            initialStatus={params.status ?? ""}
            initialParticipantType={params.participantType ?? ""}
            events={events}
          />

          <Card>
            {rows.length === 0 ? (
              hasFilters ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState
                  icon={ClipboardList}
                  title="Aucune inscription"
                  description="Inscrivez le premier participant à un événement."
                  action={canCreate ? <RegistrationFormDialog events={events} people={people} defaultEventId={params.eventId} /> : undefined}
                  className="border-0"
                />
              )
            ) : (
              <>
                <RegistrationsTable rows={rows} canUpdate={canUpdate} canDelete={canDelete} />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (params.status) sp.set("status", params.status);
                    if (params.eventId) sp.set("eventId", params.eventId);
                    if (params.participantType) sp.set("participantType", params.participantType);
                    sp.set("page", String(p));
                    return `/registrations?${sp.toString()}`;
                  }}
                />
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Inscriptions par événement</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationsByEventBars rows={byEvent} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Répartition des statuts</CardTitle>
            </CardHeader>
            <CardContent>
              <RegistrationStatusDonut rows={statusBreakdown} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild variant="outline" className="justify-start">
                <Link href="/communication">
                  <Send className="size-4" />
                  Envoyer un rappel
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-start">
                <a href="/api/reports/registrations?format=csv" download>
                  <ClipboardList className="size-4" />
                  Exporter les données
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
