import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { AdminForm } from "@/features/onboarding/components/admin-form";

export default async function OnboardingAdminPage() {
  // Une session existante veut dire que l'étape 2 (création du compte) est déjà faite — sinon
  // un retour ici (email confirmé dans un nouvel onglet, session déjà active...) échouerait
  // sur "email déjà utilisé" en re-soumettant le formulaire d'inscription.
  const user = await getCurrentUser();
  if (user) redirect("/onboarding/configuration");

  return <AdminForm />;
}
