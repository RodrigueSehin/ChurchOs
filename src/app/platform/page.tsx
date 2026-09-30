import { Building2, Users, UserRound, Wallet } from "lucide-react";

import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ORG_STATUS_LABELS } from "@/features/platform/components/org-status-badge";
import { getPlatformOverview } from "@/features/platform/queries";

export default async function PlatformOverviewPage() {
  const o = await getPlatformOverview();
  const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: o.currency, maximumFractionDigits: 0 });

  return (
    <>
      <PageHeader title="Vue d'ensemble" description="Indicateurs de la plateforme, toutes églises confondues." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Building2} iconClassName="bg-primary/10 text-primary" label="Églises" value={String(o.organizationsTotal)} />
        <KpiCard icon={Users} iconClassName="bg-success/10 text-success" label="Comptes utilisateurs" value={String(o.usersTotal)} />
        <KpiCard icon={UserRound} iconClassName="bg-warning/10 text-warning" label="Membres gérés" value={String(o.membersTotal)} />
        <KpiCard
          icon={Wallet}
          iconClassName="bg-navy/10 text-navy"
          label="MRR estimé"
          value={money.format(o.mrr)}
          periodLabel="Abonnements actifs (hors essais)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Églises par statut</CardTitle>
            <CardDescription>Répartition actuelle.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-slate-100 text-sm">
              {Object.entries(ORG_STATUS_LABELS).map(([status, label]) => (
                <li key={status} className="flex items-center justify-between py-2">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-navy">{o.organizationsByStatus[status as keyof typeof o.organizationsByStatus] ?? 0}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abonnements par plan</CardTitle>
            <CardDescription>Essais, actifs, en retard et en pause.</CardDescription>
          </CardHeader>
          <CardContent>
            {o.subscriptionsByPlan.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun abonnement en cours.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-slate-100 text-sm">
                {o.subscriptionsByPlan.map((p) => (
                  <li key={p.code} className="flex items-center justify-between py-2">
                    <span className="text-slate-600">{p.name}</span>
                    <span className="font-semibold text-navy">{p.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
