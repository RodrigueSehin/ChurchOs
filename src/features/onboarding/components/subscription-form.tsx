"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Gem, Minus, Rocket, Sprout, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/features/onboarding/store";

type Support = "community" | "email" | "email_chat" | "dedicated";

export interface PlanFeatures {
  members?: boolean;
  pastoral?: boolean;
  ministries?: boolean;
  events?: boolean;
  finance?: boolean;
  training?: boolean;
  communication?: boolean;
  documents?: boolean;
  analytics?: boolean;
  multi_campus?: boolean;
  support?: Support;
}

export interface PlanOption {
  code: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  name: string;
  description: string | null;
  priceMonthly: string;
  priceYearly: string;
  currency: string;
  maxMembers: number | null;
  features: PlanFeatures;
}

const PLAN_ICON = { FREE: Sprout, STARTER: Users2, PRO: Crown, ENTERPRISE: Gem } as const;

const SUPPORT_LABEL: Record<Support, string> = {
  community: "Communauté",
  email: "Email",
  email_chat: "Email + Chat",
  dedicated: "Support dédié",
};

const FEATURE_ROWS: { key: keyof PlanFeatures; label: string }[] = [
  { key: "members", label: "Gestion des membres" },
  { key: "pastoral", label: "Suivi pastoral" },
  { key: "ministries", label: "Ministères et équipes" },
  { key: "events", label: "Événements et inscriptions" },
  { key: "finance", label: "Finances (dons, dépenses)" },
  { key: "training", label: "Formations (discipolat)" },
  { key: "communication", label: "Communication (SMS, Email, WhatsApp)" },
  { key: "documents", label: "Documents et ressources" },
  { key: "analytics", label: "Analytics et rapports" },
  { key: "multi_campus", label: "Multi-campus" },
];

function formatPrice(value: string, currency: string) {
  const n = Number(value);
  if (n === 0) return "0";
  return new Intl.NumberFormat("fr-FR").format(n) + ` ${currency}`;
}

/**
 * Voir la note dans `configuration-form.tsx` : attend la réhydratation du brouillon avant de
 * conclure qu'il est vide (sinon redirection à tort), et avant de monter `SubscriptionFields`
 * (dont `selected`/`interval` s'initialisent depuis le store via `useState`).
 */
export function SubscriptionForm({ plans }: { plans: PlanOption[] }) {
  const router = useRouter();
  const hydrated = useOnboardingStore((s) => s._hasHydrated);
  const churchName = useOnboardingStore((s) => s.churchName);

  useEffect(() => {
    if (hydrated && !churchName) router.replace("/onboarding/church");
  }, [hydrated, churchName, router]);

  if (!hydrated || !churchName) return null;
  return <SubscriptionFields plans={plans} />;
}

function SubscriptionFields({ plans }: { plans: PlanOption[] }) {
  const router = useRouter();
  const onboarding = useOnboardingStore();

  const [selected, setSelected] = useState(onboarding.planCode);
  const [interval, setInterval] = useState<"monthly" | "yearly">(onboarding.billingInterval);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onboarding.setSubscription({ planCode: selected, billingInterval: interval });
    router.push("/onboarding/finalization");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-navy">Choisissez votre plan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Sélectionnez l&apos;offre qui correspond aux besoins de votre église. Vous pourrez
            changer de plan à tout moment.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-start rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              interval === "monthly" ? "bg-navy text-white" : "text-slate-500",
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              interval === "yearly" ? "bg-navy text-white" : "text-slate-500",
            )}
          >
            Annuel
            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
              -20%
            </span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const Icon = PLAN_ICON[plan.code];
            const isSelected = selected === plan.code;
            const isPopular = plan.code === "PRO";
            const isEnterprise = plan.code === "ENTERPRISE";
            const price = interval === "yearly" ? plan.priceYearly : plan.priceMonthly;

            return (
              <button
                key={plan.code}
                type="button"
                onClick={() => setSelected(plan.code)}
                className={cn(
                  "relative flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors",
                  isSelected ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300",
                  isPopular && !isSelected && "border-gold/60",
                )}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-semibold text-navy shadow-sm">
                    Le plus populaire
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-navy/5 text-navy">
                    <Icon className="size-4" />
                  </span>
                  {isSelected && <Check className="size-4 text-primary" />}
                </div>
                <div>
                  <p className="font-semibold text-navy">{plan.name}</p>
                  <p className="text-xs text-slate-400">{plan.description}</p>
                </div>
                <div>
                  {isEnterprise ? (
                    <span className="text-xl font-semibold text-navy">Sur devis</span>
                  ) : (
                    <>
                      <span className="text-xl font-semibold text-navy">
                        {formatPrice(price, plan.currency)}
                      </span>
                      <span className="text-xs text-slate-400">
                        /{interval === "yearly" ? "an" : "mois"}
                      </span>
                    </>
                  )}
                </div>
                {plan.maxMembers && (
                  <span className="text-xs text-slate-400">
                    Jusqu&apos;à {plan.maxMembers.toLocaleString("fr-FR")} membres
                  </span>
                )}
                <span
                  className={cn(
                    "mt-auto flex h-9 items-center justify-center rounded-lg text-sm font-medium",
                    isSelected ? "bg-primary text-white" : "border border-slate-200 text-navy",
                  )}
                >
                  Choisir ce plan
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Fonctionnalités principales</th>
                  {plans.map((p) => (
                    <th key={p.code} className="px-3 py-2.5 text-center font-medium text-navy">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 text-slate-600">{row.label}</td>
                    {plans.map((p) => (
                      <td key={p.code} className="px-3 py-2.5 text-center">
                        {p.features[row.key] ? (
                          <Check className="mx-auto size-4 text-success" />
                        ) : (
                          <Minus className="mx-auto size-4 text-slate-300" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-2.5 text-slate-600">Support prioritaire</td>
                  {plans.map((p) => (
                    <td key={p.code} className="px-3 py-2.5 text-center text-xs text-slate-500">
                      {p.features.support ? SUPPORT_LABEL[p.features.support] : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <aside className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-navy">
                <Gem className="size-4 text-gold" />
                Pourquoi choisir ChurchOS&nbsp;?
              </p>
              <ul className="flex flex-col gap-1.5 text-xs text-slate-600">
                {[
                  "Une plateforme sécurisée et fiable",
                  "Conforme aux besoins des églises",
                  "Mises à jour régulières",
                  "Accessible sur tous vos appareils",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs italic text-slate-500">
                &ldquo;Une église bien organisée pour un plus grand impact.&rdquo;
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-white">
                  <Rocket className="size-3" />
                </span>
                <p className="text-xs font-medium text-navy">ChurchOS</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={() => router.push("/onboarding/configuration")}>
            Précédent
          </Button>
          <Button type="submit" size="lg">
            Suivant
          </Button>
        </div>
      </form>
    </div>
  );
}
