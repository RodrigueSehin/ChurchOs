import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { getPlans } from "@/features/billing/services";
import { LandingPage } from "@/features/marketing/components/landing-page";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const plans = await getPlans();
  return <LandingPage plans={plans} />;
}
