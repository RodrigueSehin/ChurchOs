import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getPeopleForSelect } from "@/features/members/services";
import { getAssignableUsers } from "@/features/prayer/queries";
import { PrayerForm } from "@/features/prayer/components/prayer-form";

export default async function NewPrayerRequestPage() {
  const check = await checkPermission("prayer.create");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouveau sujet de prière" />
        <PermissionDenied requiredPermission="prayer.create" />
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
      <PageHeader title="Nouveau sujet de prière" description="Ajoutez un sujet de prière pour un membre, un visiteur ou de façon anonyme." />
      <PrayerForm people={people} assignableUsers={assignableUsers} cancelHref="/prayer" />
    </div>
  );
}
