import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getCampuses, getOrganizationDetail } from "@/features/organizations/queries";
import { OrganizationSettingsForm } from "@/features/organizations/components/organization-settings-form";
import { OrganizationLogoUploader } from "@/features/organizations/components/organization-logo-uploader";
import { CampusManager } from "@/features/organizations/components/campus-manager";

export default async function ChurchSettingsPage() {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Église" description="Informations de l'église, campus, fuseau horaire et devise." />
        <PermissionDenied requiredPermission="settings.manage" />
      </div>
    );
  }

  const organizationId = check.organization.organization.id;
  const [organization, campuses] = await Promise.all([
    getOrganizationDetail(organizationId),
    getCampuses(organizationId),
  ]);

  if (!organization) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Église" />
        <p className="text-sm text-danger">Organisation introuvable.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Église"
        description="Informations de l'église, campus, fuseau horaire et devise."
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
          <CardDescription>Visibles par les membres de votre organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettingsForm organization={organization} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo de l&apos;église</CardTitle>
          <CardDescription>Affiché à la place du logo ChurchOS dans le menu et la barre du haut de l&apos;application.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationLogoUploader organizationName={organization.name} logoUrl={organization.logoUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <CampusManager campuses={campuses} />
        </CardContent>
      </Card>
    </div>
  );
}
