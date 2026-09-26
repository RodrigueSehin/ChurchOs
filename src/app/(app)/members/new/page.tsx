import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getCampuses } from "@/features/organizations/queries";
import { createMember } from "@/features/members/actions";
import { MemberForm } from "@/features/members/components/member-form";

export default async function NewMemberPage() {
  const check = await checkPermission("members.create");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouveau membre" />
        <PermissionDenied requiredPermission="members.create" />
      </div>
    );
  }

  const campuses = await getCampuses(check.organization.organization.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nouveau membre" description="Ajoutez un membre à votre église." />
      <MemberForm action={createMember} campuses={campuses} cancelHref="/members" />
    </div>
  );
}
