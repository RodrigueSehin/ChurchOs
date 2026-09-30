import Image from "next/image";

import churchImage from "@/img/eglise.png";

interface PageHeroCta {
  icon: React.ElementType;
  line1: string;
  line2: string;
}

interface PageHeroProps {
  title: string;
  description: string;
  quote: string;
  verseRef: string;
  cta?: PageHeroCta;
  /** Boutons d'action (ex. « Nouveau cours »), alignés en bas à droite de la bannière. */
  actions?: React.ReactNode;
}

/**
 * Bannière d'en-tête réutilisable pour les pages de module (Membres, Événements, Familles...) —
 * même photo d'église que la bannière du tableau de bord, mais traitement clair (overlay blanc en
 * dégradé plutôt que sombre) puisque le texte ici est en bleu marine, pas en blanc. Voir les
 * différentes captures `Entête_*.png` : structure identique (titre/description/verset/CTA
 * optionnel), seul le contenu change par page.
 */
export function PageHero({ title, description, quote, verseRef, cta: Cta, actions }: PageHeroProps) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl">
      <Image src={churchImage} alt="" fill priority className="-z-10 object-cover object-right" sizes="100vw" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white via-white/85 to-white/10" />

      <div className="flex min-h-[150px] flex-col justify-between gap-4 p-6 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy">{title}</h1>
            <p className="mt-1.5 max-w-lg text-sm text-slate-600">{description}</p>
          </div>

          <div className="text-right text-navy/80 sm:pr-36">
            <p className="italic">
              « {quote} »
            </p>
            <p className="mt-1 text-sm text-navy/50">{verseRef}</p>
          </div>
        </div>

        {actions && <div className="self-end">{actions}</div>}

        {Cta && (
          <div className="self-end rounded-xl bg-navy/85 px-4 py-3 text-white backdrop-blur-sm">
            <p className="text-sm font-semibold">{Cta.line1}</p>
            <p className="flex items-center gap-1.5 text-xs text-white/80">
              <Cta.icon className="size-3.5" />
              {Cta.line2}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
