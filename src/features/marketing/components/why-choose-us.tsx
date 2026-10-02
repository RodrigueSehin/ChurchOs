import { HeadphonesIcon, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Reveal } from "@/features/marketing/components/reveal";

const REASONS = [
  { icon: Users, label: "Facile à utiliser", description: "Une interface intuitive pour tous les membres de l'équipe.", color: "bg-blue-100 text-blue-600" },
  { icon: ShieldCheck, label: "Sécurisé et fiable", description: "Vos données sont protégées avec les standards les plus élevés.", color: "bg-green-100 text-green-600" },
  { icon: Sparkles, label: "Adapté à votre église", description: "Fonctionne pour les petites comme pour les grandes églises.", color: "bg-amber-100 text-amber-600" },
  { icon: HeadphonesIcon, label: "Support dédié", description: "Une équipe à l'écoute pour vous accompagner.", color: "bg-purple-100 text-purple-600" },
];

export function WhyChooseUs() {
  return (
    <section className="bg-slate-50/60 py-16">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Pourquoi choisir ChurchOS ?</span>
          <h2 className="mt-2 text-3xl font-bold text-navy">Une solution pensée pour les églises d&apos;aujourd&apos;hui</h2>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((r, i) => (
            <Reveal key={r.label} delay={i * 110} direction="scale" className="h-full">
              <div className="group h-full rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:border-primary/30 hover:shadow-xl hover:shadow-slate-200/70">
                <span className={`mx-auto flex size-12 items-center justify-center rounded-full transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[360deg] ${r.color}`}>
                  <r.icon className="size-5" />
                </span>
                <p className="mt-4 font-semibold text-navy">{r.label}</p>
                <p className="mt-1.5 text-sm text-slate-500">{r.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
