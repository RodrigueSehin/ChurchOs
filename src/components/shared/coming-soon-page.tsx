import { Construction } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";

interface ComingSoonPageProps {
  title: string;
  description: string;
  phase: number;
}

/**
 * Placeholder honnête pour un module dont la page est déclarée dans la navigation
 * mais dont le CRUD/la donnée réelle arrive dans une phase ultérieure du plan de
 * sprints (docs/architecture/07-sprint-plan.md). Pas de bouton ni de donnée factice
 * présentés comme fonctionnels.
 */
export function ComingSoonPage({ title, description, phase }: ComingSoonPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title="Module en construction"
        description={`Ce module sera implémenté en Phase ${phase} du plan de développement (voir docs/architecture/07-sprint-plan.md).`}
      />
    </div>
  );
}
