import { notFound } from "next/navigation";
import { Box, Building2 } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getEquipmentFormOptions, getResourceForEdit } from "@/features/resources/queries/form";
import { EquipmentForm } from "@/features/resources/components/equipment-form";
import { RoomForm } from "@/features/resources/components/room-form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("resources.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Modifier" />
        <PermissionDenied requiredPermission="resources.manage" />
      </div>
    );
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const organizationId = check.organization.organization.id;
  const loaded = await guardSchema(async () => {
    const resource = await getResourceForEdit(organizationId, id);
    return { resource, options: resource && resource.type !== "room" ? await getEquipmentFormOptions(organizationId) : null };
  });
  if (!loaded.ok) return <MigrationNotice migration="2026-10-11-resources-forms.sql" />;
  const { resource, options } = loaded.data;
  if (!resource) notFound();

  const isRoom = resource.type === "room";
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className={isRoom ? "flex size-12 items-center justify-center rounded-xl bg-orange-100 text-orange-500" : "flex size-12 items-center justify-center rounded-xl bg-blue-100 text-primary"}>
          {isRoom ? <Building2 className="size-6" /> : <Box className="size-6" />}
        </span>
        <PageHeader title={isRoom ? "Modifier la salle" : "Modifier l'équipement"} description={resource.name} />
      </div>
      {isRoom ? (
        <RoomForm organizationId={organizationId} room={resource} />
      ) : (
        <EquipmentForm organizationId={organizationId} equipment={resource} rooms={options?.rooms.filter((r) => r.id !== resource.id) ?? []} people={options?.people ?? []} />
      )}
    </div>
  );
}
