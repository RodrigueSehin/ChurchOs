import { redirect } from "next/navigation";

/**
 * La création de compte se fait désormais à l'intérieur de l'assistant de création d'église
 * (`/onboarding/admin`, étape 2 sur 5) plutôt que sur une page dédiée — voir
 * `docs/architecture/07-sprint-plan.md`. Cette route est conservée pour ne pas casser
 * d'éventuels liens existants vers `/register`.
 */
export default function RegisterPage() {
  redirect("/onboarding/church");
}
