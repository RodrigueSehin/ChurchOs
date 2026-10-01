import Link from "next/link";
import { Eye, Mail, Megaphone, Plus, Users } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getAudienceBreakdown,
  getCommunicationFeed,
  getCommunicationKpis,
  getEmailTemplatesForSelect,
  getMessageRecipients,
  getMessages,
  getTemplates,
  getTypeDistribution,
} from "@/features/communication/queries";
import { getPeopleWithEmailForSelect } from "@/features/members/services";
import { CommunicationTabs } from "@/features/communication/components/communication-tabs";
import { FeedTable } from "@/features/communication/components/feed-table";
import { FeedToolbar } from "@/features/communication/components/feed-toolbar";
import { TemplateFormDialog } from "@/features/communication/components/template-form-dialog";
import { TemplatesList } from "@/features/communication/components/templates-list";
import { ComposeMessageForm } from "@/features/communication/components/compose-message-form";
import { MessagesHistory } from "@/features/communication/components/messages-history";
import { DonutChart } from "@/features/training/components/donut-chart";

const HERO = {
  title: "Annonces et Messages",
  description: "Communiquez efficacement avec les membres de votre église.",
  verseContext: "communication" as const,
};

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string; view?: string }>;
}) {
  const check = await checkPermission("communication.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <PermissionDenied requiredPermission="communication.view" />
      </div>
    );
  }

  const params = await searchParams;
  const tab = params.tab ?? "announcements";
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("communication.manage");
  const canSend = check.context.isAdmin || check.context.permissions.has("communication.send");
  const page = Math.max(1, Number(params.page) || 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        {...HERO}
        actions={
          canManage ? (
            <Button asChild size="sm">
              <Link href="/communication/new">
                <Plus className="size-4" />
                Nouvelle annonce
              </Link>
            </Button>
          ) : undefined
        }
      />
      {tab !== "announcements" && <CommunicationTabs active={tab} />}

      {tab === "announcements" && (
        <FeedTab
          organizationId={organizationId}
          search={params.q}
          view={["announcement", "message", "draft", "scheduled"].includes(params.view ?? "") ? (params.view as string) : ""}
          page={page}
          canManage={canManage}
          canSend={canSend}
          isAdmin={check.context.isAdmin}
        />
      )}
      {tab === "templates" && <TemplatesTab organizationId={organizationId} canManage={canManage} isAdmin={check.context.isAdmin} />}
      {tab === "compose" && (canSend ? <ComposeTab organizationId={organizationId} /> : <PermissionDenied requiredPermission="communication.send" />)}
      {tab === "history" && <HistoryTab organizationId={organizationId} page={page} canSend={canSend} />}
    </div>
  );
}

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

async function FeedTab({
  organizationId,
  search,
  view,
  page,
  canManage,
  canSend,
  isAdmin,
}: {
  organizationId: string;
  search?: string;
  view: string;
  page: number;
  canManage: boolean;
  canSend: boolean;
  isAdmin: boolean;
}) {
  const loaded = await guardSchema(async () => {
    const feed = await getCommunicationFeed({ organizationId, search, view, page });
    return { feed, kpis: await getCommunicationKpis(organizationId, feed.all) };
  });
  if (!loaded.ok) return <MigrationNotice migration="2026-10-08-announcements-redesign.sql puis 2026-10-09-announcement-composer.sql" />;
  const { feed, kpis } = loaded.data;
  const distribution = getTypeDistribution(feed.all);
  const audiences = getAudienceBreakdown(feed.all);
  const recent = feed.all.filter((i) => i.status === "published").slice(0, 5);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Megaphone}
          iconClassName="bg-blue-100 text-blue-600"
          label="Annonces publiées"
          value={n(kpis.publishedAnnouncements.value)}
          delta={kpis.publishedAnnouncements.growthPct ?? undefined}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Mail}
          iconClassName="bg-green-100 text-green-600"
          label="Messages envoyés"
          value={n(kpis.sentMessages.value)}
          delta={kpis.sentMessages.growthPct ?? undefined}
          periodLabel="vs mois dernier"
        />
        <KpiCard icon={Users} iconClassName="bg-purple-100 text-purple-600" label="Membres touchés" value={n(kpis.membersReached)} periodLabel="par au moins un message" />
        <KpiCard
          icon={Eye}
          iconClassName="bg-amber-100 text-amber-600"
          label="Taux de lecture moyen"
          value={kpis.readRate === null ? "—" : `${kpis.readRate}%`}
          periodLabel="lecteurs / membres actifs"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-5">
            <FeedToolbar view={view} initialSearch={search ?? ""} counts={feed.counts} />
            <div className="flex flex-wrap gap-2 text-xs">
              {canSend && (
                <Link href="/communication/messages" className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-navy hover:bg-slate-200">
                  Composer un message
                </Link>
              )}
              <Link href="/communication?tab=templates" className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-navy hover:bg-slate-200">
                Modèles
              </Link>
              <Link href="/communication?tab=history" className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-navy hover:bg-slate-200">
                Historique des envois
              </Link>
            </div>

            {feed.rows.length === 0 ? (
              search || view ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={Megaphone} title="Aucune annonce" description="Créez la première annonce de votre église." className="border-0" />
              )
            ) : (
              <FeedTable rows={feed.rows} canManage={canManage} isAdmin={isAdmin} />
            )}
            <Pagination
              page={page}
              pageSize={feed.pageSize}
              total={feed.total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (search) sp.set("q", search);
                if (view) sp.set("view", view);
                sp.set("page", String(p));
                return `/communication?${sp.toString()}`;
              }}
            />
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Répartition par type</CardTitle>
            </CardHeader>
            <CardContent>
              {distribution.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune donnée pour le moment.</p>
              ) : (
                <DonutChart data={distribution} centerLabel="Publications" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destinataires</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {audiences.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune donnée pour le moment.</p>
              ) : (
                audiences.map((a) => (
                  <div key={a.label} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5 text-slate-600">
                      <Users className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{a.label}</span>
                    </span>
                    <span className="font-semibold text-navy">{a.value}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Annonces récentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {recent.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune publication pour le moment.</p>
              ) : (
                recent.map((r) => (
                  <div key={`${r.kind}-${r.id}`} className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-navy to-primary text-white/80">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- image du bucket public
                        <img src={r.imageUrl} alt="" className="size-full object-cover" />
                      ) : r.kind === "announcement" ? (
                        <Megaphone className="size-4" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-navy">{r.title}</span>
                      <span className="block text-xs text-slate-400">{new Intl.DateTimeFormat("fr-FR").format(r.date)}</span>
                    </span>
                    <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">Publiée</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

async function TemplatesTab({ organizationId, canManage, isAdmin }: { organizationId: string; canManage: boolean; isAdmin: boolean }) {
  const templates = await getTemplates(organizationId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">{canManage && <TemplateFormDialog />}</div>
      <Card>
        <CardContent className="pt-5">
          {templates.length === 0 ? (
            <EmptyState icon={Megaphone} title="Aucun modèle" description="Créez un modèle réutilisable pour vos envois." className="border-0" />
          ) : (
            <TemplatesList templates={templates} isAdmin={isAdmin} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function ComposeTab({ organizationId }: { organizationId: string }) {
  const [templates, recipients] = await Promise.all([
    getEmailTemplatesForSelect(organizationId),
    getPeopleWithEmailForSelect(organizationId),
  ]);

  return <ComposeMessageForm templates={templates} recipients={recipients} />;
}

async function HistoryTab({ organizationId, page, canSend }: { organizationId: string; page: number; canSend: boolean }) {
  const { rows, total, pageSize } = await getMessages({ organizationId, page });
  const recipientsByMessage: Record<string, Awaited<ReturnType<typeof getMessageRecipients>>> = {};
  await Promise.all(
    rows.map(async (m) => {
      recipientsByMessage[m.id] = await getMessageRecipients(organizationId, m.id);
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-5">
          <MessagesHistory messages={rows} recipientsByMessage={recipientsByMessage} canSend={canSend} />
          {rows.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              hrefForPage={(p) => `/communication?tab=history&page=${p}`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
