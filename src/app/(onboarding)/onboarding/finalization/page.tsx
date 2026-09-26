import { requireUser } from "@/lib/auth/session";
import { FinalizationForm } from "@/features/onboarding/components/finalization-form";

export default async function OnboardingFinalizationPage() {
  await requireUser();

  return <FinalizationForm />;
}
