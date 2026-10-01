import { MessageSquare, Send, Users, Mail } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { isSmsConfigured } from "@/lib/sms/twilio";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { getComposerOptions, getMessagesKpis, getMessagesList } from "@/features/communication/queries/messages";
import { MessagesToolbar } from "@/features/communication/components/messages-toolbar";
import { MessagesWorkspace } from "@/features/communication/components/messages-workspace";

const HERO = {
  title: "Messages (SMS/Email)",
  description: "Communiquez facilement avec les membres de votre église par SMS ou Email.",
  verseContext: "communication" as const,
};

const n = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; page?: string }> }) {
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
  const organizationId = check.organization.organization.id;
  const canSend = check.context.isAdmin || check.context.permissions.has("communication.send");
  const view = ["sms", "email", "draft", "scheduled"].includes(params.view ?? "") ? (params.view as string) : "";
  const page = Math.max(1, Number(params.page) || 1);

  const loaded = await guardSchema(async () => {
    const list = await getMessagesList({ organizationId, view, search: params.q, page });
    const [kpis, options] = await Promise.all([getMessagesKpis(organizationId, list.all), getComposerOptions(organizationId)]);
    return { list, kpis, options };
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHero {...HERO} />
      {!loaded.ok ? (
        <MigrationNotice migration="2026-10-all-migrations.sql" />
      ) : (
        <Body {...loaded.data} view={view} search={params.q} page={page} canSend={canSend} isAdmin={check.context.isAdmin} />
      )}
    </div>
  );
}

function Body({
  list,
  kpis,
  options,
  view,
  search,
  page,
  canSend,
  isAdmin,
}: {
  list: Awaited<ReturnType<typeof getMessagesList>>;
  kpis: Awaited<ReturnType<typeof getMessagesKpis>>;
  options: Awaited<ReturnType<typeof getComposerOptions>>;
} & { view: string; search?: string; page: number; canSend: boolean; isAdmin: boolean }) {
  const smsReady = isSmsConfigured();
  const emailReady = Boolean(process.env.RESEND_API_KEY);

  return (
    <>
      {canSend && (!smsReady || !emailReady) && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {!smsReady && <p>L&apos;envoi de SMS n&apos;est pas encore configuré : ajoutez TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM (ou TWILIO_MESSAGING_SERVICE_SID) dans les variables d&apos;environnement.</p>}
          {!emailReady && <p>L&apos;envoi d&apos;emails n&apos;est pas encore configuré : ajoutez RESEND_API_KEY.</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={MessageSquare} iconClassName="bg-blue-100 text-blue-600" label="Messages envoyés" value={n(kpis.sentCount)} delta={kpis.growthPct ?? undefined} periodLabel="vs mois dernier" />
        <KpiCard icon={Users} iconClassName="bg-purple-100 text-purple-600" label="Destinataires uniques" value={n(kpis.uniqueRecipients)} periodLabel="personnes contactées" />
        <KpiCard icon={Mail} iconClassName="bg-green-100 text-green-600" label="Taux de délivrance" value={kpis.deliveryRate === null ? "—" : `${kpis.deliveryRate}%`} periodLabel="envois acceptés par le fournisseur" />
      </div>

      <MessagesWorkspace
        rows={list.rows}
        options={options}
        canSend={canSend}
        isAdmin={isAdmin}
        toolbar={<MessagesToolbar view={view} initialSearch={search ?? ""} counts={list.counts} />}
        empty={
          search || view ? (
            <NoResultsState className="border-0" />
          ) : (
            <EmptyState icon={Send} title="Aucun message" description="Rédigez votre premier SMS ou email avec le formulaire « Nouveau message »." className="border-0" />
          )
        }
        footer={
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>
              Affichage de {list.total === 0 ? 0 : (page - 1) * list.pageSize + 1} à {Math.min(page * list.pageSize, list.total)} sur {list.total} message{list.total > 1 ? "s" : ""}
            </p>
            <Pagination
              page={page}
              pageSize={list.pageSize}
              total={list.total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (search) sp.set("q", search);
                if (view) sp.set("view", view);
                sp.set("page", String(p));
                return `/communication/messages?${sp.toString()}`;
              }}
            />
          </div>
        }
      />
    </>
  );
}
