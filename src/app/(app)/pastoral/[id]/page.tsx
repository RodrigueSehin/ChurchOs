import { notFound } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAssignableUsers, getPastoralFollowupDetail } from "@/features/pastoral/queries";
import { getPeopleForSelect } from "@/features/members/services";
import {
  CONFIDENTIALITY_LABELS,
  PASTORAL_STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/features/pastoral/schemas";
import { PastoralEditDialog } from "@/features/pastoral/components/pastoral-edit-dialog";
import { PastoralNotesPanel } from "@/features/pastoral/components/pastoral-notes-panel";
import { ArchivePastoralButton } from "@/features/pastoral/components/archive-pastoral-button";

const STATUS_VARIANT: Record<string, "success" | "warning" | "secondary" | "default"> = {
  new: "secondary",
  in_progress: "default",
  waiting: "warning",
  completed: "success",
  cancelled: "secondary",
  archived: "secondary",
};

const CONFIDENTIALITY_VARIANT: Record<string, "secondary" | "warning" | "danger"> = {
  normal: "secondary",
  pastoral: "warning",
  restricted: "danger",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export default async function PastoralDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("pastoral.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Suivi pastoral" />
        <PermissionDenied requiredPermission="pastoral.view" />
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

  const detail = await getPastoralFollowupDetail(organizationId, id, ctx);
  if (!detail) notFound();
  const { followup, person, notes } = detail;

  const canUpdate = check.context.isAdmin || check.context.permissions.has("pastoral.update");
  const canDelete = check.context.isAdmin || check.context.permissions.has("pastoral.delete");

  const [people, assignableUsers] = await Promise.all([
    canUpdate ? getPeopleForSelect(organizationId) : Promise.resolve([]),
    canUpdate ? getAssignableUsers(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={followup.title}
        description={`${person.firstName} ${person.lastName}`}
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && <PastoralEditDialog followup={followup} people={people} assignableUsers={assignableUsers} />}
            {canDelete && followup.status !== "archived" && (
              <ArchivePastoralButton id={followup.id} title={followup.title} />
            )}
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
                value={<Badge variant={STATUS_VARIANT[followup.status] ?? "secondary"}>{PASTORAL_STATUS_LABELS[followup.status] ?? followup.status}</Badge>}
              />
              <Field label="Priorité" value={PRIORITY_LABELS[followup.priority] ?? followup.priority} />
              <Field label="Échéance" value={followup.dueDate} />
              <Field
                label="Confidentialité"
                value={
                  <Badge variant={CONFIDENTIALITY_VARIANT[followup.confidentiality] ?? "secondary"}>
                    {CONFIDENTIALITY_LABELS[followup.confidentiality] ?? followup.confidentiality}
                  </Badge>
                }
              />
            </dl>
            {followup.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Description</dt>
                <dd className="mt-1 text-sm text-slate-600">{followup.description}</dd>
              </div>
            )}
            {followup.nextAction && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Prochaine action</dt>
                <dd className="mt-1 text-sm text-slate-600">{followup.nextAction}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <PastoralNotesPanel followupId={followup.id} notes={notes} canAdd={canUpdate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
