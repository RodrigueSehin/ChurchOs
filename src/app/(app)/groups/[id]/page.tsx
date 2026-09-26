import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGroupDetail } from "@/features/groups/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { updateGroup } from "@/features/groups/actions";
import { GROUP_TYPE_LABELS, SERVICE_DAY_LABELS } from "@/features/groups/schemas";
import { GroupFormDialog } from "@/features/groups/components/group-form-dialog";
import { GroupMembersPanel } from "@/features/groups/components/group-members-panel";
import { DeleteGroupButton } from "@/features/groups/components/delete-group-button";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Groupe" />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const { id } = await params;
  const organizationId = check.organization.organization.id;
  const [detail, people] = await Promise.all([
    getGroupDetail(organizationId, id),
    getPeopleForSelect(organizationId),
  ]);
  if (!detail) notFound();

  const { group, members } = detail;
  const leader = members.find((m) => m.personId === group.leaderPersonId);
  const canUpdate = check.context.isAdmin || check.context.permissions.has("members.update");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={group.name}
        description={<Badge variant="secondary">{GROUP_TYPE_LABELS[group.type] ?? group.type}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <GroupFormDialog
                action={updateGroup.bind(null, group.id)}
                people={people}
                group={group}
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                }
              />
            )}
            {check.context.isAdmin && <DeleteGroupButton groupId={group.id} groupName={group.name} />}
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
              <Field
                label="Rencontre"
                value={
                  group.meetingDay != null
                    ? `${SERVICE_DAY_LABELS[String(group.meetingDay)] ?? ""}${group.meetingTime ? " · " + group.meetingTime.slice(0, 5) : ""}`
                    : null
                }
              />
              <Field label="Lieu" value={group.meetingLocation} />
              <Field label="Capacité" value={group.capacity} />
            </dl>
            {group.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Description</dt>
                <dd className="mt-1 text-sm text-slate-600">{group.description}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <GroupMembersPanel groupId={group.id} members={members} people={people} canManage={canUpdate} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
