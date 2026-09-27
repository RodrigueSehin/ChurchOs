"use client";

import { useState, useTransition } from "react";
import { Check, Crown, Gem, Sprout, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { changePlan } from "@/features/billing/actions";
import type { PlanFeatures } from "@/features/billing/schemas";
import type { plans as plansTable } from "@/lib/db/schema";

type Plan = typeof plansTable.$inferSelect;

const PLAN_ICON: Record<string, typeof Sprout> = { FREE: Sprout, STARTER: Users2, PRO: Crown, ENTERPRISE: Gem };

function formatPrice(value: string, currency: string) {
  const n = Number(value);
  if (n === 0) return "0";
  return new Intl.NumberFormat("fr-FR").format(n) + ` ${currency}`;
}

export function PlanPicker({
  plans,
  currentPlanCode,
  currentInterval,
}: {
  plans: Plan[];
  currentPlanCode: string;
  currentInterval: string;
}) {
  const [interval, setInterval] = useState<"monthly" | "yearly">(
    currentInterval === "yearly" ? "yearly" : "monthly",
  );
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChoose(planCode: string) {
    setError(null);
    setPendingPlan(planCode);
    startTransition(async () => {
      const res = await changePlan(planCode, interval);
      if (res.error) {
        setError(res.error);
        setPendingPlan(null);
        return;
      }
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
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

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const Icon = PLAN_ICON[plan.code] ?? Sprout;
          const isCurrent = plan.code === currentPlanCode;
          const isEnterprise = plan.code === "ENTERPRISE";
          const price = interval === "yearly" ? plan.priceYearly : plan.priceMonthly;
          const features = (plan.features ?? {}) as PlanFeatures;
          const hasStripePrice = Boolean(
            interval === "yearly" ? features.stripePriceIdYearly : features.stripePriceIdMonthly,
          );
          const disabled = isCurrent || isEnterprise || (plan.code !== "FREE" && !hasStripePrice) || isPending;

          return (
            <div
              key={plan.code}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4",
                isCurrent ? "border-primary bg-primary/5" : "border-slate-200",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-lg bg-navy/5 text-navy">
                  <Icon className="size-4" />
                </span>
                {isCurrent && <Check className="size-4 text-primary" />}
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
                    <span className="text-xl font-semibold text-navy">{formatPrice(price, plan.currency)}</span>
                    <span className="text-xs text-slate-400">/{interval === "yearly" ? "an" : "mois"}</span>
                  </>
                )}
              </div>
              {plan.maxMembers && (
                <span className="text-xs text-slate-400">Jusqu&apos;à {plan.maxMembers.toLocaleString("fr-FR")} membres</span>
              )}
              <Button
                type="button"
                variant={isCurrent ? "secondary" : "outline"}
                size="sm"
                className="mt-auto"
                disabled={disabled}
                onClick={() => handleChoose(plan.code)}
              >
                {isCurrent
                  ? "Plan actuel"
                  : isEnterprise
                    ? "Nous contacter"
                    : !hasStripePrice && plan.code !== "FREE"
                      ? "Indisponible"
                      : pendingPlan === plan.code && isPending
                        ? "Chargement..."
                        : "Choisir ce plan"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
