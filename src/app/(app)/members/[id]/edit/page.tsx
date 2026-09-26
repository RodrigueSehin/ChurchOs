import { notFound } from "next/navigation";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getCampuses } from "@/features/organizations/queries";
import { getMemberDetail } from "@/features/members/queries";
import { updateMember } from "@/features/members/actions";
import { MemberForm } from "@/features/members/components/member-form";

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("members.update");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Modifier le membre" />
        <PermissionDenied requiredPermission="members.update" />
      </div>
    );
  }

  const { id } = await params;
  const [detail, campuses] = await Promise.all([
    getMemberDetail(check.organization.organization.id, id),
    getCampuses(check.organization.organization.id),
  ]);
  if (!detail) notFound();

  const boundAction = updateMember.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Modifier ${detail.person.firstName} ${detail.person.lastName}`} />
      <MemberForm
        action={boundAction}
        campuses={campuses}
        initial={{ person: detail.person, member: detail.member }}
        cancelHref={`/members/${id}`}
      />
    </div>
  );
}
