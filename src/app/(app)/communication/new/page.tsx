import { Megaphone } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getAudienceOptions } from "@/features/communication/queries";
import { getSocialConnections } from "@/features/social/queries";
import { AnnouncementComposer } from "@/features/communication/components/announcement-composer";

export default async function NewAnnouncementPage() {
  const check = await checkPermission("communication.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouvelle annonce" />
        <PermissionDenied requiredPermission="communication.manage" />
      </div>
    );
  }

  const organization = check.organization.organization;
  const [audienceOptions, connections] = await Promise.all([getAudienceOptions(organization.id), getSocialConnections(organization.id)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Megaphone className="size-6" />
        </span>
        <PageHeader
          title="Nouvelle annonce"
          description="Créez et publiez une annonce pour informer les membres de votre église et partagez-la sur vos canaux digitaux."
        />
      </div>
      <AnnouncementComposer
        organizationId={organization.id}
        organizationName={organization.name}
        logoUrl={organization.logoUrl ?? null}
        connections={connections.map((c) => ({ id: c.id, provider: c.provider, label: c.label }))}
        audienceOptions={audienceOptions}
      />
    </div>
  );
}
