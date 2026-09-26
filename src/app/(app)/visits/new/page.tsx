import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getPeopleForSelect } from "@/features/members/services";
import { getAssignableUsers } from "@/features/visits/queries";
import { VisitForm } from "@/features/visits/components/visit-form";

export default async function NewVisitPage() {
  const check = await checkPermission("visits.create");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouvelle visite" />
        <PermissionDenied requiredPermission="visits.create" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const [people, assignableUsers] = await Promise.all([
    getPeopleForSelect(organizationId),
    getAssignableUsers(organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nouvelle visite" description="Planifiez ou enregistrez une visite." />
      <VisitForm people={people} assignableUsers={assignableUsers} cancelHref="/visits" />
    </div>
  );
}
