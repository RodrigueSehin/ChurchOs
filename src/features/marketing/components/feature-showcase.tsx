import Image from "next/image";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckSquare,
  FolderOpen,
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { Reveal } from "@/features/marketing/components/reveal";
import dashboardPreview from "@/img/marketing-dashboard-preview.png";
import mobilePreview from "@/img/marketing-mobile-preview.png";

const FEATURES = [
  { icon: Users, label: "Gestion des membres", description: "Profils, familles, visiteurs, groupes.", color: "bg-blue-100 text-blue-600" },
  { icon: HeartHandshake, label: "Suivi pastoral", description: "Visites, sujets de prière, conseils.", color: "bg-pink-100 text-pink-600" },
  { icon: Sparkles, label: "Ministères et équipes", description: "Organisation et plannings.", color: "bg-purple-100 text-purple-600" },
  { icon: BookOpen, label: "Formations", description: "Cours, discipolat, certifications.", color: "bg-green-100 text-green-600" },
  { icon: Calendar, label: "Événements et inscriptions", description: "Cultes, séminaires, formations.", color: "bg-amber-100 text-amber-600" },
  { icon: MessageSquare, label: "Communication", description: "Annonces, emails, SMS, WhatsApp.", color: "bg-cyan-100 text-cyan-600" },
  { icon: CheckSquare, label: "Présences", description: "Suivi simple et rapide.", color: "bg-orange-100 text-orange-600" },
  { icon: FolderOpen, label: "Documents et ressources", description: "Bibliothèque, salles, équipements.", color: "bg-indigo-100 text-indigo-600" },
  { icon: Wallet, label: "Finances", description: "Dons, offrandes, dépenses, budgets.", color: "bg-teal-100 text-teal-600" },
  { icon: BarChart3, label: "Rapports et statistiques", description: "Tableaux de bord et analyses.", color: "bg-rose-100 text-rose-600" },
];

export function FeatureShowcase() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal className="text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-primary">Tout ce dont votre église a besoin</span>
        <h2 className="mt-2 text-3xl font-bold text-navy">Une plateforme complète pour une église vivante</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          ChurchOS centralise tous les aspects de la vie de votre église dans une seule plateforme simple, moderne et
          sécurisée.
        </p>
      </Reveal>

      <div className="mt-12 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.label} delay={(i % 2) * 80 + Math.floor(i / 2) * 90} direction="left">
              <div className="group flex items-start gap-3 rounded-lg p-2 transition-colors duration-300 hover:bg-slate-50">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${f.color}`}>
                  <f.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-navy">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.description}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal direction="right" delay={150}>
          <div className="relative">
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-card transition-transform duration-500 hover:scale-[1.02]">
              <Image src={dashboardPreview} alt="Tableau de bord ChurchOS" className="w-full" sizes="(min-width: 1024px) 50vw, 100vw" />
            </div>
            <div className="absolute -bottom-8 -left-6 hidden w-36 animate-float-slow overflow-hidden rounded-2xl border-4 border-white shadow-card sm:block">
              <Image src={mobilePreview} alt="ChurchOS sur mobile" className="w-full" />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
