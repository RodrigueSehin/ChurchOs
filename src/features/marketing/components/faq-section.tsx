"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Reveal } from "@/features/marketing/components/reveal";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    question: "Puis-je essayer ChurchOS gratuitement ?",
    answer: "Oui — le plan Gratuit reste utilisable sans limite de temps, jusqu'à 100 membres, sans carte bancaire requise.",
  },
  {
    question: "Où mes données sont-elles hébergées ?",
    answer: "Vos données sont hébergées de façon sécurisée et isolées par organisation — aucune autre église n'y a accès.",
  },
  {
    question: "Puis-je changer de plan à tout moment ?",
    answer: "Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment depuis les paramètres de facturation.",
  },
  {
    question: "ChurchOS fonctionne-t-il pour les églises avec plusieurs campus ?",
    answer: "Oui, la gestion multi-campus est disponible à partir du plan Enterprise.",
  },
  {
    question: "Quel support est inclus ?",
    answer: "Chaque plan inclut un niveau de support différent, du support communautaire (plan Gratuit) jusqu'au support dédié (Enterprise) — voir le tableau des tarifs ci-dessus.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">Questions fréquentes</span>
        <h2 className="mt-2 text-3xl font-bold text-navy">Vous avez des questions ?</h2>
      </Reveal>

      <div className="mt-10 flex flex-col gap-3">
        {FAQS.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <Reveal key={faq.question} delay={i * 80}>
              <div className={cn("rounded-xl border bg-white transition-all duration-300", isOpen ? "border-primary/30 shadow-md" : "border-slate-200 hover:border-slate-300")}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-navy"
                >
                  {faq.question}
                  <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform duration-300", isOpen && "rotate-180 text-primary")} />
                </button>
                {/* Ouverture animée : la hauteur passe de 0fr à 1fr (grille) sans mesurer le contenu. */}
                <div className={cn("grid transition-all duration-300 ease-out", isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-sm text-slate-600">{faq.answer}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
