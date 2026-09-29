import { Star } from "lucide-react";

/** Témoignages illustratifs — ChurchOS n'a pas encore de client réel au moment de la rédaction ;
 * à remplacer par de vrais témoignages dès qu'ils existent (voir la note laissée à l'utilisateur). */
const TESTIMONIALS = [
  {
    quote: "ChurchOS a vraiment transformé la manière dont nous gérons notre église. Simple, complet et très intuitif !",
    name: "Pasteur Koffi",
    role: "Église La Grâce — Abidjan",
  },
  {
    quote: "La gestion des événements et des présences est maintenant beaucoup plus facile. Un outil indispensable !",
    name: "Sœur Aminata",
    role: "Responsable Jeunesse",
  },
  {
    quote: "Un excellent support et une équipe à l'écoute. ChurchOS nous aide à mieux servir notre communauté.",
    name: "Frère Emmanuel",
    role: "Église Vie Nouvelle",
  },
];

export function TestimonialsSection() {
  return (
    <section id="temoignages" className="bg-slate-50/60 py-16">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">Ils nous font confiance</span>
        <h2 className="mt-2 text-3xl font-bold text-navy">Ce que disent nos utilisateurs</h2>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 text-left">
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <p className="text-sm italic text-slate-600">&laquo; {t.quote} &raquo;</p>
              <div>
                <p className="text-sm font-semibold text-navy">{t.name}</p>
                <p className="text-xs text-slate-400">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
