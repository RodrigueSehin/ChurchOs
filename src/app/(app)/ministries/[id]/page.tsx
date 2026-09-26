import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMinistryDetail } from "@/features/ministries/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { updateMinistry } from "@/features/ministries/actions";
import { MINISTRY_STATUS_LABELS } from "@/features/ministries/schemas";
import { MinistryFormDialog } from "@/features/ministries/components/ministry-form-dialog";
import { MinistryMembersPanel } from "@/features/ministries/components/ministry-members-panel";
import { DeleteMinistryButton } from "@/features/ministries/components/delete-ministry-button";

const STATUS_VARIANT: Record<string, "success" | "secondary"> = {
  active: "success",
  inactive: "secondary",
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

export default async function MinistryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("ministries.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Ministère" />
        <PermissionDenied requiredPermission="ministries.view" />
      </div>
    );
  }

  const { id } = await params;
  const organizationId = check.organization.organization.id;
  const [detail, people] = await Promise.all([
    getMinistryDetail(organizationId, id),
    getPeopleForSelect(organizationId),
  ]);
  if (!detail) notFound();

  const { ministry, members } = detail;
  const leader = members.find((m) => m.personId === ministry.leaderPersonId);
  const canUpdate = check.context.isAdmin || check.context.permissions.has("ministries.update");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={ministry.name}
        description={<Badge variant={STATUS_VARIANT[ministry.status] ?? "secondary"}>{MINISTRY_STATUS_LABELS[ministry.status] ?? ministry.status}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <MinistryFormDialog
                action={updateMinistry.bind(null, ministry.id)}
                people={people}
                ministry={ministry}
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                }
              />
            )}
            {check.context.isAdmin && <DeleteMinistryButton ministryId={ministry.id} ministryName={ministry.name} />}
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
              <Field label="Responsable" value={leader ? `${leader.firstName} ${leader.lastName}` : null} />
              <Field label="Code" value={ministry.code} />
            </dl>
            {ministry.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Description</dt>
                <dd className="mt-1 text-sm text-slate-600">{ministry.description}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <MinistryMembersPanel ministryId={ministry.id} members={members} people={people} canManage={canUpdate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
