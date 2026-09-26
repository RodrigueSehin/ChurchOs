import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { plans as plansTable } from "@/lib/db/schema";
import { SubscriptionForm, type PlanOption } from "@/features/onboarding/components/subscription-form";

const PLAN_ORDER = ["FREE", "STARTER", "PRO", "ENTERPRISE"] as const;

export default async function OnboardingSubscriptionPage() {
  await requireUser();

  const rows = await db
    .select({
      code: plansTable.code,
      name: plansTable.name,
      description: plansTable.description,
      priceMonthly: plansTable.priceMonthly,
      priceYearly: plansTable.priceYearly,
      currency: plansTable.currency,
      maxMembers: plansTable.maxMembers,
      features: plansTable.features,
    })
    .from(plansTable);

  const plans: PlanOption[] = rows
    .filter((p): p is typeof p & { code: PlanOption["code"] } =>
      (PLAN_ORDER as readonly string[]).includes(p.code),
    )
    .sort((a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code))
    .map((p) => ({
      ...p,
      features: (p.features ?? {}) as PlanOption["features"],
    }));

  return <SubscriptionForm plans={plans} />;
}
