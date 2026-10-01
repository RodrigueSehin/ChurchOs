import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Megaphone } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { announcements } from "@/lib/db/schema";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getAudienceOptions } from "@/features/communication/queries";
import { getSocialConnections } from "@/features/social/queries";
import { AnnouncementComposer } from "@/features/communication/components/announcement-composer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditAnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("communication.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Modifier l'annonce" />
        <PermissionDenied requiredPermission="communication.manage" />
      </div>
    );
  }

  const { id } = await params;
  const organization = check.organization.organization;
  if (!UUID_RE.test(id)) notFound();
  const [announcement] = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.organizationId, organization.id)));
  if (!announcement) notFound();

  const [audienceOptions, connections] = await Promise.all([getAudienceOptions(organization.id), getSocialConnections(organization.id)]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Megaphone className="size-6" />
        </span>
        <PageHeader title="Modifier l'annonce" description={announcement.title} />
      </div>
      <AnnouncementComposer
        organizationId={organization.id}
        organizationName={organization.name}
        logoUrl={organization.logoUrl ?? null}
        connections={connections.map((c) => ({ id: c.id, provider: c.provider, label: c.label }))}
        audienceOptions={audienceOptions}
        announcement={announcement}
      />
    </div>
  );
}
