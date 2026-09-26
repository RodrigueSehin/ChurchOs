import { notFound } from "next/navigation";
import { CheckCircle2, Lock } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssignableUsers, getPrayerRequestDetail } from "@/features/prayer/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { PRAYER_STATUS_LABELS, PRIORITY_LABELS } from "@/features/prayer/schemas";
import { PrayerEditDialog } from "@/features/prayer/components/prayer-edit-dialog";
import { PrayerUpdatesPanel } from "@/features/prayer/components/prayer-updates-panel";
import { MarkAnsweredDialog } from "@/features/prayer/components/mark-answered-dialog";
import { ArchivePrayerButton } from "@/features/prayer/components/archive-prayer-button";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  open: "secondary",
  in_progress: "default",
  answered: "success",
  closed: "secondary",
  archived: "secondary",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export default async function PrayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("prayer.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Sujet de prière" />
        <PermissionDenied requiredPermission="prayer.view" />
      </div>
    );
  }

  const { id } = await params;
  const organizationId = check.organization.organization.id;
  const ctx = {
    userId: check.user.id,
    isAdmin: check.context.isAdmin,
    canViewConfidential: check.context.permissions.has("pastoral.view_confidential"),
  };

  const detail = await getPrayerRequestDetail(organizationId, id, ctx);
  if (!detail) notFound();
  const { request, person, updates } = detail;

  const canUpdate = check.context.isAdmin || check.context.permissions.has("prayer.update");

  const [people, assignableUsers] = await Promise.all([
    canUpdate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    canUpdate ? getAssignableUsers(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={request.title}
        description={
          <span className="flex items-center gap-1.5">
            {request.isConfidential && <Lock className="size-3.5" />}
            {person ? `${person.firstName} ${person.lastName}` : "Anonyme"}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && request.status !== "answered" && <MarkAnsweredDialog id={request.id} />}
            {canUpdate && <PrayerEditDialog request={request} people={people} assignableUsers={assignableUsers} />}
            {canUpdate && request.status !== "archived" && <ArchivePrayerButton id={request.id} title={request.title} />}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Statut"
                value={<Badge variant={STATUS_VARIANT[request.status] ?? "secondary"}>{PRAYER_STATUS_LABELS[request.status] ?? request.status}</Badge>}
              />
              <Field label="Priorité" value={PRIORITY_LABELS[request.priority] ?? request.priority} />
              <Field label="Catégorie" value={request.category} />
            </dl>
            {request.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Description</dt>
                <dd className="mt-1 text-sm text-slate-600">{request.description}</dd>
              </div>
            )}
            {request.status === "answered" && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-success/10 p-3 text-sm text-success">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">Prière exaucée</p>
                  {request.answerTestimony && <p className="mt-1 text-slate-600">{request.answerTestimony}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <PrayerUpdatesPanel prayerRequestId={request.id} updates={updates} canAdd={canUpdate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
