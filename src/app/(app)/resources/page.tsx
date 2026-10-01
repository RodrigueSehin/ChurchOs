import { CalendarCheck, DoorOpen, Monitor, ShieldCheck, Warehouse } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { getReservationsBetween, getResourcesOverview } from "@/features/resources/queries";
import { readMeta } from "@/features/resources/schemas";
import { CalendarMonth } from "@/features/resources/components/calendar-month";
import { EquipmentTable } from "@/features/resources/components/equipment-table";
import { NewResourceMenu } from "@/features/resources/components/new-resource-menu";
import { ReservationsTable } from "@/features/resources/components/reservations-table";
import { ResourcesToolbar } from "@/features/resources/components/resources-toolbar";
import { RoomsWorkspace } from "@/features/resources/components/rooms-workspace";

const HERO = {
  title: "Salles & équipements",
  description: "Gérez vos salles et équipements, consultez la disponibilité et planifiez vos réservations.",
  verseContext: "resources" as const,
};
const PAGE_SIZE = 10;

const n = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

export default async function ResourcesPage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; page?: string; room?: string; month?: string }> }) {
  const check = await checkPermission("resources.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <PermissionDenied requiredPermission="resources.view" />
      </div>
    );
  }

  const params = await searchParams;
  const tab = ["rooms", "equipment", "reservations", "calendar"].includes(params.tab ?? "") ? (params.tab as string) : "rooms";
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("resources.manage");
  const canReserve = check.context.isAdmin || check.context.permissions.has("resources.reserve");
  const page = Math.max(1, Number(params.page) || 1);
  const term = params.q?.trim().toLowerCase();

  const overview = await getResourcesOverview(organizationId);
  const { kpis } = overview;
  const roomOptions = overview.rooms.map((r) => ({ id: r.id, name: r.name }));
  const roomNames = Object.fromEntries(overview.roomNames);

  const pageSlice = <T,>(list: T[]) => list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const footer = (total: number, hrefForPage: (p: number) => string, noun: string) => (
    <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <p>
        Affichage de {total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} à {Math.min(page * PAGE_SIZE, total)} sur {total} {noun}
        {total > 1 ? "s" : ""}
      </p>
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefForPage={hrefForPage} />
    </div>
  );
  const href = (extra: Record<string, string | undefined>) => (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ tab: tab === "rooms" ? undefined : tab, q: params.q, ...extra })) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `/resources?${sp.toString()}`;
  };
  const toolbar = <ResourcesToolbar tab={tab} initialSearch={params.q ?? ""} actions={canManage ? <NewResourceMenu rooms={roomOptions} /> : undefined} />;

  let content: React.ReactNode;
  if (tab === "rooms") {
    const rooms = overview.rooms.filter((r) => !term || `${r.name} ${r.location ?? ""} ${r.meta.roomType ?? ""}`.toLowerCase().includes(term));
    content = (
      <RoomsWorkspace
        rooms={pageSlice(rooms)}
        allRooms={roomOptions}
        canManage={canManage}
        canReserve={canReserve}
        isAdmin={check.context.isAdmin}
        toolbar={toolbar}
        empty={term ? <NoResultsState className="border-0" /> : <EmptyState icon={Warehouse} title="Aucune salle" description="Créez la première salle avec « Nouvelle salle »." className="border-0" />}
        footer={footer(rooms.length, href({}), "salle")}
      />
    );
  } else if (tab === "equipment") {
    const items = overview.equipment.filter((e) => {
      const meta = readMeta(e.metadata);
      if (params.room && meta.roomId !== params.room) return false;
      return !term || `${e.name} ${meta.category ?? ""}`.toLowerCase().includes(term);
    });
    content = (
      <div className="flex flex-col gap-4">
        {toolbar}
        {params.room && roomNames[params.room] && (
          <p className="text-sm text-slate-600">
            Équipements de la salle <strong className="text-navy">{roomNames[params.room]}</strong> ·{" "}
            <a href="/resources?tab=equipment" className="text-primary hover:underline">Tout afficher</a>
          </p>
        )}
        {items.length === 0 ? (
          term || params.room ? <NoResultsState className="border-0" /> : <EmptyState icon={Monitor} title="Aucun équipement" description="Ajoutez le premier équipement avec « Nouvel équipement »." className="border-0" />
        ) : (
          <EquipmentTable items={pageSlice(items)} roomNames={roomNames} rooms={roomOptions} canManage={canManage} canReserve={canReserve} isAdmin={check.context.isAdmin} />
        )}
        {footer(items.length, href({ room: params.room }), "équipement")}
      </div>
    );
  } else if (tab === "reservations") {
    const items = overview.reservations.filter((r) => !term || `${r.resourceName} ${r.purpose ?? ""} ${r.requesterName ?? ""}`.toLowerCase().includes(term));
    content = (
      <div className="flex flex-col gap-4">
        {toolbar}
        {items.length === 0 ? (
          term ? <NoResultsState className="border-0" /> : <EmptyState icon={CalendarCheck} title="Aucune réservation" description="Réservez une salle ou un équipement depuis l'onglet correspondant." className="border-0" />
        ) : (
          <ReservationsTable items={pageSlice(items)} currentUserId={check.user.id} canManage={canManage} />
        )}
        {footer(items.length, href({}), "réservation")}
      </div>
    );
  } else {
    const match = /^(\d{4})-(\d{2})$/.exec(params.month ?? "");
    const now = new Date();
    const year = match ? Number(match[1]) : now.getUTCFullYear();
    const month = match ? Math.min(11, Math.max(0, Number(match[2]) - 1)) : now.getUTCMonth();
    const monthReservations = await getReservationsBetween(organizationId, new Date(Date.UTC(year, month, 1)), new Date(Date.UTC(year, month + 1, 1)));
    content = (
      <div className="flex flex-col gap-4">
        {toolbar}
        <CalendarMonth year={year} month={month} reservations={monthReservations} hrefForMonth={(y, m) => `/resources?tab=calendar&month=${y}-${String(m + 1).padStart(2, "0")}`} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHero {...HERO} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={DoorOpen} iconClassName="bg-blue-100 text-blue-600" label="Salles" value={n(kpis.rooms.value)} delta={kpis.rooms.delta} deltaSuffix="" periodLabel="vs mois dernier" />
        <KpiCard icon={Monitor} iconClassName="bg-purple-100 text-purple-600" label="Équipements" value={n(kpis.equipment.value)} delta={kpis.equipment.delta} deltaSuffix="" periodLabel="vs mois dernier" />
        <KpiCard icon={CalendarCheck} iconClassName="bg-red-100 text-red-500" label="Réservations ce mois" value={n(kpis.reservations.value)} delta={kpis.reservations.growthPct ?? undefined} periodLabel="vs mois dernier" />
        <KpiCard
          icon={ShieldCheck}
          iconClassName="bg-green-100 text-green-600"
          label="Taux d'occupation"
          value={kpis.occupancy.value === null ? "—" : `${kpis.occupancy.value}%`}
          delta={kpis.occupancy.delta ?? undefined}
          periodLabel="vs 30 jours précédents"
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          {content}
        </CardContent>
      </Card>
    </div>
  );
}
