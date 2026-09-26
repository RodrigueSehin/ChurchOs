import { requireUser } from "@/lib/auth/session";
import { ConfigurationForm } from "@/features/onboarding/components/configuration-form";

export default async function OnboardingConfigurationPage() {
  // Redirige vers /login (avec retour ici) si le compte de l'étape 2 n'a pas de session active.
  await requireUser();

  return <ConfigurationForm />;
}
