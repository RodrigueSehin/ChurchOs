import { BarChart3, Calendar, HeartHandshake, Sparkles, Users, Wallet } from "lucide-react";

const MODULES = [
  { icon: Users, label: "Membres", description: "Gérez votre communauté", color: "bg-blue-100 text-blue-600" },
  { icon: Calendar, label: "Événements", description: "Organisez et suivez", color: "bg-green-100 text-green-600" },
  { icon: Sparkles, label: "Ministères", description: "Équipes et plannings", color: "bg-purple-100 text-purple-600" },
  { icon: HeartHandshake, label: "Suivi pastoral", description: "Accompagnez et priez", color: "bg-pink-100 text-pink-600" },
  { icon: Wallet, label: "Finances", description: "Dons et rapports", color: "bg-amber-100 text-amber-600" },
  { icon: BarChart3, label: "Statistiques", description: "Prenez de meilleures décisions", color: "bg-cyan-100 text-cyan-600" },
];

export function ModuleBadges() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/60">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:grid-cols-6 lg:px-8">
        {MODULES.map((m) => (
          <div key={m.label} className="flex flex-col items-center gap-2 text-center">
            <span className={`flex size-12 items-center justify-center rounded-full ${m.color}`}>
              <m.icon className="size-5" />
            </span>
            <p className="text-sm font-semibold text-navy">{m.label}</p>
            <p className="text-xs text-slate-500">{m.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
