import Link from "next/link";
import { CheckCircle2, Database, LayoutGrid, PartyPopper, Rocket, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireUser, requireOrganization } from "@/lib/auth/session";
import { getCountry } from "@/features/onboarding/constants";

const NEXT_STEPS = [
  {
    icon: Database,
    title: "Configuration de l'espace",
    description: "Votre espace ChurchOS a été créé et configuré selon vos préférences.",
  },
  {
    icon: Users,
    title: "Activation des modules",
    description: "Les modules sélectionnés sont maintenant disponibles dans votre espace.",
  },
  {
    icon: ShieldCheck,
    title: "Votre compte administrateur",
    description: "Votre compte est actif et vous avez un accès complet à l'espace.",
  },
  {
    icon: Rocket,
    title: "Vous pouvez commencer",
    description: "Accédez maintenant à votre tableau de bord et commencez à utiliser ChurchOS.",
  },
];

export default async function OnboardingWelcomePage() {
  const user = await requireUser();
  const { organization } = await requireOrganization(user.id);
  const country = getCountry(organization.countryCode);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-8">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success/10 text-success">
        <PartyPopper className="size-7" />
      </div>
      <h2 className="mt-4 text-2xl font-semibold text-navy">Votre espace ChurchOS est prêt&nbsp;!</h2>
      <p className="mt-1 text-sm text-slate-500">
        Votre église a été créée avec succès. Bienvenue dans l&apos;aventure ChurchOS&nbsp;!
      </p>

      <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
            <LayoutGrid className="size-4" />
          </span>
          <div>
            <p className="font-medium text-navy">{organization.name}</p>
            <p className="text-xs text-slate-500">
              {organization.description && `${organization.description} · `}
              {country.flag} {organization.city ?? country.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" />
          Espace créé — votre organisation est opérationnelle
        </div>
      </div>

      <p className="mt-8 text-left text-sm font-medium text-navy">Que se passe-t-il maintenant&nbsp;?</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NEXT_STEPS.map((step, i) => (
          <div key={step.title} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 text-left">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <step.icon className="size-4 text-navy" />
            </div>
            <p className="text-sm font-medium text-navy">{step.title}</p>
            <p className="text-xs text-slate-500">{step.description}</p>
            <span className="mt-auto flex w-fit items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              <CheckCircle2 className="size-3" />
              Terminé
            </span>
          </div>
        ))}
      </div>

      <Button asChild size="lg" className="mt-8">
        <Link href="/dashboard">
          <LayoutGrid className="size-4" />
          Accéder à mon tableau de bord
        </Link>
      </Button>
    </div>
  );
}
