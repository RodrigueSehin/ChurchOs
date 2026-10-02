"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/features/marketing/components/reveal";
import { cn } from "@/lib/utils";
import type { plans as plansTable } from "@/lib/db/schema";

type Plan = typeof plansTable.$inferSelect;

type Support = "community" | "email" | "email_chat" | "dedicated";
interface PlanFeatures {
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

const SUPPORT_LABEL: Record<Support, string> = {
  community: "Support communautaire",
  email: "Support par email",
  email_chat: "Support par email et chat",
  dedicated: "Support dédié",
};

const FEATURE_ROWS: { key: keyof PlanFeatures; label: string }[] = [
  { key: "members", label: "Gestion des membres" },
  { key: "events", label: "Événements et inscriptions" },
  { key: "pastoral", label: "Suivi pastoral" },
  { key: "ministries", label: "Ministères et équipes" },
  { key: "finance", label: "Finances (dons, dépenses)" },
  { key: "training", label: "Formations" },
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

export function PricingSection({ plans }: { plans: Plan[] }) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  return (
    <section id="tarifs" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
          Des plans adaptés à vos besoins
        </span>
        <h2 className="mt-2 text-3xl font-bold text-navy">Des tarifs simples et transparents</h2>

        <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "monthly" ? "bg-navy text-white" : "text-slate-500",
            )}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setInterval("yearly")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              interval === "yearly" ? "bg-navy text-white" : "text-slate-500",
            )}
          >
            Annuel
            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold text-success">
              -20%
            </span>
          </button>
        </div>
      </Reveal>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, index) => {
          const isEnterprise = plan.code === "ENTERPRISE";
          const isPro = plan.code === "PRO";
          const price = interval === "yearly" ? plan.priceYearly : plan.priceMonthly;
          const features = (plan.features ?? {}) as PlanFeatures;
          const trueFeatures = FEATURE_ROWS.filter((f) => features[f.key]).slice(0, 4);

          return (
            <Reveal key={plan.code} delay={index * 120} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col gap-4 rounded-xl border bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-slate-200/80",
                  isPro
                    ? "border-amber-400 shadow-card ring-4 ring-amber-100"
                    : "border-slate-200 hover:border-primary/30",
                )}
              >
                {isPro && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-semibold text-navy">
                    Le plus populaire
                  </span>
                )}
                <div>
                  <p className="font-semibold text-navy">{plan.name}</p>
                  <p className="text-xs text-slate-400">{plan.description}</p>
                </div>
                <div>
                  {isEnterprise ? (
                    <span className="text-2xl font-bold text-navy">Sur devis</span>
                  ) : (
                    <>
                      <span
                        key={interval}
                        className="inline-block animate-fade-in text-2xl font-bold text-navy"
                      >
                        {formatPrice(price, plan.currency)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {" "}
                        /{interval === "yearly" ? "an" : "mois"}
                      </span>
                    </>
                  )}
                </div>
                <ul className="flex flex-1 flex-col gap-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {plan.maxMembers
                      ? `Jusqu'à ${plan.maxMembers.toLocaleString("fr-FR")} membres`
                      : "Membres illimités"}
                  </li>
                  {trueFeatures.map((f) => (
                    <li key={f.key} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {f.label}
                    </li>
                  ))}
                  <li className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    {SUPPORT_LABEL[features.support ?? "community"]}
                  </li>
                </ul>
                <Button
                  asChild
                  variant={isPro ? "default" : "outline"}
                  className={
                    isPro
                      ? "bg-amber-400 text-navy hover:bg-amber-400/90"
                      : plan.code === "FREE"
                        ? ""
                        : "bg-navy text-white hover:bg-navy/90"
                  }
                >
                  {isEnterprise ? (
                    <a href="mailto:support@churchos.app">Nous contacter</a>
                  ) : (
                    <Link href="/onboarding/church">
                      {plan.code === "FREE" ? "Commencer gratuitement" : `Choisir ${plan.name}`}
                    </Link>
                  )}
                </Button>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
