import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgStatusBadge } from "@/features/platform/components/org-status-badge";
import { OrganizationStatusForm } from "@/features/platform/components/organization-status-form";
import { getPlatformOrganizationDetail } from "@/features/platform/queries";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-navy">{value}</p>
    </div>
  );
}

export default async function PlatformOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const detail = await getPlatformOrganizationDetail(id);
  if (!detail) notFound();
  const { org, subscription } = detail;

  return (
    <>
      <Link href="/platform/organizations" className="flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-navy">
        <ChevronLeft className="size-4" />
        Toutes les églises
      </Link>

      <PageHeader
        title={org.name}
        description={[org.city, org.countryCode].filter(Boolean).join(", ")}
        actions={<OrgStatusBadge status={org.status} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>Volumétrie de l&apos;église (compteurs uniquement, aucune donnée pastorale).</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Membres" value={detail.memberTotal} />
            <Stat label="Utilisateurs" value={detail.userTotal} />
            <Stat label="Campus" value={detail.campusTotal} />
            <Stat label="Créée le" value={dateFormat.format(org.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abonnement</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {subscription ? (
              <>
                <p className="font-semibold text-navy">{subscription.planName}</p>
                <p className="text-slate-500">
                  {subscription.status} · {subscription.interval === "yearly" ? "annuel" : "mensuel"}
                  {subscription.provider ? ` · ${subscription.provider}` : ""}
                </p>
                {subscription.trialEndsAt && subscription.status === "trialing" && (
                  <p className="text-slate-500">Fin d&apos;essai : {dateFormat.format(subscription.trialEndsAt)}</p>
                )}
                {subscription.currentPeriodEnd && (
                  <p className="text-slate-500">
                    {subscription.cancelAtPeriodEnd ? "Se termine le" : "Renouvellement le"}{" "}
                    {dateFormat.format(subscription.currentPeriodEnd)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-500">Aucun abonnement en cours.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
          <Stat label="Email" value={<span className="text-sm font-normal">{org.email ?? "—"}</span>} />
          <Stat label="Téléphone" value={<span className="text-sm font-normal">{org.phone ?? "—"}</span>} />
          <Stat label="Site web" value={<span className="text-sm font-normal">{org.website ?? "—"}</span>} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accès</CardTitle>
          <CardDescription>Cette action est tracée dans le journal d&apos;audit de l&apos;église.</CardDescription>
        </CardHeader>
        <CardContent>
          {org.status === "archived" ? (
            <p className="text-sm text-slate-500">Cette église est archivée.</p>
          ) : (
            <OrganizationStatusForm organizationId={org.id} status={org.status} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
