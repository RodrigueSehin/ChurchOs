import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getPlatformPlans } from "@/features/platform/queries";

function limit(value: number | null) {
  return value === null ? "Illimité" : String(value);
}

export default async function PlatformPlansPage() {
  const plans = await getPlatformPlans();

  return (
    <>
      <PageHeader
        title="Plans"
        description="Catalogue des plans et nombre d'abonnés en cours. Les prix et produits Stripe se gèrent via db:setup-stripe-billing."
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-3 py-2.5 font-medium">Mensuel</th>
                <th className="px-3 py-2.5 font-medium">Annuel</th>
                <th className="px-3 py-2.5 font-medium">Membres max.</th>
                <th className="px-3 py-2.5 font-medium">Campus max.</th>
                <th className="px-3 py-2.5 font-medium">Abonnés</th>
                <th className="px-3 py-2.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: p.currency, maximumFractionDigits: 0 });
                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.code}</p>
                    </td>
                    <td className="px-3 py-3">{money.format(Number(p.priceMonthly))}</td>
                    <td className="px-3 py-3">{money.format(Number(p.priceYearly))}</td>
                    <td className="px-3 py-3">{limit(p.maxMembers)}</td>
                    <td className="px-3 py-3">{limit(p.maxCampuses)}</td>
                    <td className="px-3 py-3 font-semibold text-navy">{p.subscribers}</td>
                    <td className="px-3 py-3">
                      <Badge variant={p.isActive ? "success" : "secondary"}>{p.isActive ? "Actif" : "Inactif"}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
