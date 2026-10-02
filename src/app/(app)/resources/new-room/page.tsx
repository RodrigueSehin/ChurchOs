import { Building2 } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { probeResourceColumns } from "@/features/resources/queries/form";
import { RoomForm } from "@/features/resources/components/room-form";

export default async function NewRoomPage() {
  const check = await checkPermission("rooms.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouvelle salle" />
        <PermissionDenied requiredPermission="rooms.manage" />
      </div>
    );
  }
  const organizationId = check.organization.organization.id;
  const loaded = await guardSchema(() => probeResourceColumns(organizationId));
  if (!loaded.ok) return <MigrationNotice migration="2026-10-11-resources-forms.sql" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-orange-100 text-orange-500">
          <Building2 className="size-6" />
        </span>
        <PageHeader title="Nouvelle salle" description="Ajoutez une nouvelle salle pour la gestion des espaces de votre église." />
      </div>
      <RoomForm organizationId={organizationId} />
    </div>
  );
}
