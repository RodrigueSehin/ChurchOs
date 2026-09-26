import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getPeopleForSelect } from "@/features/members/services";
import { getAssignableUsers } from "@/features/pastoral/queries";
import { PastoralForm } from "@/features/pastoral/components/pastoral-form";

export default async function NewPastoralFollowupPage() {
  const check = await checkPermission("pastoral.create");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouveau suivi pastoral" />
        <PermissionDenied requiredPermission="pastoral.create" />
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
      <PageHeader title="Nouveau suivi pastoral" description="Créez un nouveau suivi pastoral pour un membre ou un visiteur." />
      <PastoralForm people={people} assignableUsers={assignableUsers} cancelHref="/pastoral" />
    </div>
  );
}
