import { Box } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { getEquipmentFormOptions, probeResourceColumns } from "@/features/resources/queries/form";
import { EquipmentForm } from "@/features/resources/components/equipment-form";

export default async function NewEquipmentPage() {
  const check = await checkPermission("equipment.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Nouvel équipement" />
        <PermissionDenied requiredPermission="equipment.manage" />
      </div>
    );
  }
  const organizationId = check.organization.organization.id;
  const loaded = await guardSchema(async () => {
    await probeResourceColumns(organizationId);
    return getEquipmentFormOptions(organizationId);
  });
  if (!loaded.ok) return <MigrationNotice migration="2026-10-11-resources-forms.sql" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="flex size-12 items-center justify-center rounded-xl bg-blue-100 text-primary">
          <Box className="size-6" />
        </span>
        <PageHeader title="Nouvel équipement" description="Ajoutez un nouvel équipement pour la gestion de vos ressources." />
      </div>
      <EquipmentForm organizationId={organizationId} rooms={loaded.data.rooms} people={loaded.data.people} />
    </div>
  );
}
