import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getVisitorDetail } from "@/features/visitors/queries";
import { getPeopleForSelect } from "@/features/members/services";
import { updateVisitor } from "@/features/visitors/actions";
import { VISITOR_STATUS_LABELS } from "@/features/visitors/schemas";
import { VisitorFormDialog } from "@/features/visitors/components/visitor-form-dialog";
import { ConvertToMemberButton, VisitorStatusSelect } from "@/features/visitors/components/visitor-actions";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export default async function VisitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("members.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Visiteur" />
        <PermissionDenied requiredPermission="members.view" />
      </div>
    );
  }

  const { id } = await params;
  const organizationId = check.organization.organization.id;
  const detail = await getVisitorDetail(organizationId, id);
  if (!detail) notFound();
  const { visitor, person } = detail;

  const canUpdate = check.context.isAdmin || check.context.permissions.has("members.update");
  const canConvert = check.context.isAdmin || check.context.permissions.has("members.create");
  const inviters = canUpdate ? await getPeopleForSelect(organizationId) : [];
  const name = `${person.firstName} ${person.lastName}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={name}
        description={`Statut : ${VISITOR_STATUS_LABELS[visitor.status] ?? visitor.status}`}
        actions={
          <div className="flex items-center gap-2">
            {canUpdate && (
              <VisitorFormDialog
                action={updateVisitor.bind(null, visitor.id)}
                inviters={inviters}
                visitor={detail}
                trigger={
                  <Button type="button" variant="secondary" size="sm">
                    <Pencil className="size-4" />
                    Modifier
                  </Button>
                }
              />
            )}
            {canConvert && visitor.status !== "converted" && <ConvertToMemberButton visitorId={visitor.id} name={name} />}
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
              <Field label="Email" value={person.email} />
              <Field label="Téléphone" value={person.phone} />
              <Field label="Première visite" value={visitor.firstVisitDate} />
              <Field label="Source" value={visitor.source} />
              <Field label="Date de relance" value={visitor.followUpDate} />
            </dl>
            {visitor.notes && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <dt className="text-xs text-slate-400">Notes</dt>
                <dd className="mt-1 text-sm text-slate-600">{visitor.notes}</dd>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statut du suivi</CardTitle>
          </CardHeader>
          <CardContent>
            {canUpdate ? (
              <VisitorStatusSelect visitorId={visitor.id} status={visitor.status} />
            ) : (
              <p className="text-sm text-navy">{VISITOR_STATUS_LABELS[visitor.status] ?? visitor.status}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
