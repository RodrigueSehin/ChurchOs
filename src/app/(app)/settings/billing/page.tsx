import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSubscription, getPlans } from "@/features/billing/queries";
import { syncCheckoutSession } from "@/features/billing/actions";
import { BILLING_INTERVAL_LABELS, SUBSCRIPTION_STATUS_LABELS } from "@/features/billing/schemas";
import { PlanPicker } from "@/features/billing/components/plan-picker";
import { InvoicesTable } from "@/features/billing/components/invoices-table";
import { getPaymentProvider, type InvoiceSummary } from "@/lib/payments";

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  trialing: "secondary",
  active: "success",
  past_due: "danger",
  paused: "warning",
  cancelled: "secondary",
  expired: "secondary",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; success?: string; canceled?: string }>;
}) {
  const check = await checkPermission("settings.manage");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Facturation" description="Plan d'abonnement, factures et moyens de paiement." />
        <PermissionDenied requiredPermission="settings.manage" />
      </div>
    );
  }

  const params = await searchParams;

  // Retour de Stripe Checkout : synchronise puis nettoie l'URL (évite une re-synchronisation à
  // chaque rafraîchissement de la page) — voir la note sur ce flux synchrone dans
  // `features/billing/actions`.
  if (params.session_id) {
    const sync = await syncCheckoutSession(params.session_id);
    redirect(sync.error ? "/settings/billing?syncError=true" : "/settings/billing?success=true");
  }

  const organizationId = check.organization.organization.id;
  const [current, plans] = await Promise.all([getCurrentSubscription(organizationId), getPlans()]);

  let invoices: InvoiceSummary[] = [];
  if (current?.subscription.providerCustomerId) {
    try {
      invoices = await getPaymentProvider().listInvoices(current.subscription.providerCustomerId);
    } catch {
      // Stripe non configuré (pas de clé) ou indisponible — la page reste fonctionnelle sans
      // historique de factures plutôt que de planter.
      invoices = [];
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Facturation" description="Plan d'abonnement, factures et moyens de paiement." />

      {params.success === "true" && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          Votre abonnement a été mis à jour avec succès.
        </div>
      )}
      {params.canceled === "true" && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <XCircle className="size-4 shrink-0" />
          Paiement annulé — votre plan n&apos;a pas changé.
        </div>
      )}

      {current && (
        <Card>
          <CardHeader>
            <CardTitle>Abonnement actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs text-slate-400">Plan</dt>
                <dd className="text-sm font-medium text-navy">{current.plan.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Statut</dt>
                <dd>
                  <Badge variant={STATUS_VARIANT[current.subscription.status] ?? "secondary"}>
                    {SUBSCRIPTION_STATUS_LABELS[current.subscription.status] ?? current.subscription.status}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Facturation</dt>
                <dd className="text-sm font-medium text-navy">
                  {BILLING_INTERVAL_LABELS[current.subscription.billingInterval] ?? current.subscription.billingInterval}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Fin de période en cours</dt>
                <dd className="text-sm font-medium text-navy">{formatDate(current.subscription.currentPeriodEnd)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Changer de plan</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanPicker
            plans={plans}
            currentPlanCode={current?.plan.code ?? "FREE"}
            currentInterval={current?.subscription.billingInterval ?? "monthly"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Factures</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesTable invoices={invoices} />
        </CardContent>
      </Card>
    </div>
  );
}
