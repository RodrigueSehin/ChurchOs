import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFamilyDetail } from "@/features/families/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { updateFamily } from "@/features/families/actions";
import { FamilyFormDialog } from "@/features/families/components/family-form-dialog";
import { FamilyMembersPanel } from "@/features/families/components/family-members-panel";
import { DeleteFamilyButton } from "@/features/families/components/delete-family-button";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export default async function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Famille" />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const { id } = await params;
  const organizationId = check.organization.organization.id;
  const [detail, people] = await Promise.all([
    getFamilyDetail(organizationId, id),
    getPeopleForSelect(organizationId),
  ]);
  if (!detail) notFound();

  const { family, members } = detail;
  const primaryContact = members.find((m) => m.personId === family.primaryContactPersonId);
  const canUpdate = check.context.isAdmin || check.context.permissions.has("members.update");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={family.name}
        description={family.city ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <FamilyFormDialog
                action={updateFamily.bind(null, family.id)}
                people={people}
                family={family}
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                }
              />
            )}
            {check.context.isAdmin && <DeleteFamilyButton familyId={family.id} familyName={family.name} />}
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
              <Field label="Code" value={family.familyCode} />
              <Field label="Ville" value={family.city} />
              <Field label="Adresse" value={family.addressLine1} />
              <Field
                label="Contact principal"
                value={primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : null}
              />
            </dl>
            {family.notes && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Notes</dt>
                <dd className="mt-1 text-sm text-slate-600">{family.notes}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <FamilyMembersPanel
              familyId={family.id}
              members={members}
              people={people}
              canManage={canUpdate}
              isAdmin={check.context.isAdmin}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
