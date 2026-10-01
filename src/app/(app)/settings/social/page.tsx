import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Card, CardContent } from "@/components/ui/card";
import { isSocialCryptoConfigured } from "@/lib/social/crypto";
import { getSocialConnections } from "@/features/social/queries";
import { SocialAccountsManager } from "@/features/social/components/social-accounts-manager";

export default async function SocialSettingsPage() {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Réseaux sociaux" description="Comptes sur lesquels publier vos annonces." />
        <PermissionDenied requiredPermission="settings.manage" />
      </div>
    );
  }

  const loaded = await guardSchema(() => getSocialConnections(check.organization.organization.id));
  if (!loaded.ok) return <MigrationNotice migration="2026-10-09-announcement-composer.sql" />;
  const connections = loaded.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Réseaux sociaux" description="Comptes Facebook et Instagram sur lesquels publier vos annonces." />
      <Card>
        <CardContent className="pt-5">
          <SocialAccountsManager connections={connections} canManage={check.context.isAdmin} cryptoReady={isSocialCryptoConfigured()} />
        </CardContent>
      </Card>
    </div>
  );
}
