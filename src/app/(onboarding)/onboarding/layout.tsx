import { AuthPageShell } from "@/components/shared/auth-page-shell";
import { ONBOARDING_HERO } from "@/components/shared/auth-hero-presets";
import { OnboardingSteps } from "@/features/onboarding/components/onboarding-steps";

/**
 * Étapes 1 et 2 (`church`, `admin`) sont publiques : c'est là que le compte est créé.
 * Étapes 3 à 5 et `welcome` exigent une session (`requireUser()` appelé individuellement dans
 * chaque page — voir la note dans `admin/page.tsx`). Pas de garde ici pour ne pas bloquer les
 * deux premières étapes.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthPageShell hero={ONBOARDING_HERO} contentClassName="max-w-5xl">
      <div className="mb-8">
        <OnboardingSteps />
      </div>
      {children}
    </AuthPageShell>
  );
}
