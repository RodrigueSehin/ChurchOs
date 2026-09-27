import { Megaphone } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAnnouncements,
  getEmailTemplatesForSelect,
  getMessageRecipients,
  getMessages,
  getTemplates,
} from "@/features/communication/queries";
import { getPeopleWithEmailForSelect } from "@/features/members/services";
import { createAnnouncement } from "@/features/communication/actions";
import { CommunicationTabs } from "@/features/communication/components/communication-tabs";
import { AnnouncementFormDialog } from "@/features/communication/components/announcement-form-dialog";
import { AnnouncementsTable } from "@/features/communication/components/announcements-table";
import { TemplateFormDialog } from "@/features/communication/components/template-form-dialog";
import { TemplatesList } from "@/features/communication/components/templates-list";
import { ComposeMessageForm } from "@/features/communication/components/compose-message-form";
import { MessagesHistory } from "@/features/communication/components/messages-history";

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; page?: string }>;
}) {
  const check = await checkPermission("communication.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Annonces & messages" description="Annonces, modèles, envois et historique." />
        <PermissionDenied requiredPermission="communication.view" />
      </div>
    );
  }

  const params = await searchParams;
  const tab = params.tab ?? "announcements";
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("communication.manage");
  const canSend = check.context.isAdmin || check.context.permissions.has("communication.send");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Annonces & messages" description="Annonces, modèles, envois et historique." />
      <CommunicationTabs active={tab} />

      {tab === "announcements" && (
        <AnnouncementsTab organizationId={organizationId} search={params.q} page={Math.max(1, Number(params.page) || 1)} canManage={canManage} isAdmin={check.context.isAdmin} />
      )}
      {tab === "templates" && <TemplatesTab organizationId={organizationId} canManage={canManage} isAdmin={check.context.isAdmin} />}
      {tab === "compose" && (canSend ? <ComposeTab organizationId={organizationId} /> : <PermissionDenied requiredPermission="communication.send" />)}
      {tab === "history" && <HistoryTab organizationId={organizationId} page={Math.max(1, Number(params.page) || 1)} canSend={canSend} />}
    </div>
  );
}

async function AnnouncementsTab({
  organizationId,
  search,
  page,
  canManage,
  isAdmin,
}: {
  organizationId: string;
  search?: string;
  page: number;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const { rows, total, pageSize } = await getAnnouncements({ organizationId, search, page });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <SearchBox initialValue={search ?? ""} placeholder="Rechercher une annonce..." />
        {canManage && <AnnouncementFormDialog action={createAnnouncement} />}
      </div>
      <Card>
        <CardContent className="pt-5">
          {rows.length === 0 ? (
            search ? (
              <NoResultsState className="border-0" />
            ) : (
              <EmptyState icon={Megaphone} title="Aucune annonce" description="Créez la première annonce de votre église." className="border-0" />
            )
          ) : (
            <>
              <AnnouncementsTable rows={rows} canManage={canManage} isAdmin={isAdmin} />
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                hrefForPage={(p) => {
                  const sp = new URLSearchParams();
                  sp.set("tab", "announcements");
                  if (search) sp.set("q", search);
                  sp.set("page", String(p));
                  return `/communication?${sp.toString()}`;
                }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
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
