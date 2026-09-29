import Image from "next/image";
import { Mail } from "lucide-react";

import logo from "@/img/logo_churchos.png";

const LINK_COLUMNS: { title: string; links: { label: string; href?: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "#fonctionnalites" },
      { label: "Tarifs", href: "#tarifs" },
      // Pages pas encore construites — texte non cliquable plutôt qu'un lien mort.
      { label: "Sécurité" },
      { label: "Mises à jour" },
    ],
  },
  {
    title: "Ressources",
    links: [{ label: "Blog" }, { label: "Guides" }, { label: "Centre d'aide" }, { label: "Contact", href: "mailto:support@churchos.app" }],
  },
  {
    title: "Entreprise",
    links: [{ label: "À propos" }, { label: "Conditions d'utilisation" }, { label: "Politique de confidentialité" }],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Image src={logo} alt="ChurchOS" className="h-7 w-auto" />
            <p className="mt-3 text-xs text-slate-500">Une église mieux organisée pour un plus grand impact.</p>
          </div>

          {LINK_COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy">{col.title}</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-slate-500">
                {col.links.map((link) =>
                  link.href ? (
                    <li key={link.label}>
                      <a href={link.href} className="hover:text-navy">
                        {link.label}
                      </a>
                    </li>
                  ) : (
                    <li key={link.label} className="text-slate-400">
                      {link.label}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-navy">Suivez-nous</p>
            <a
              href="mailto:support@churchos.app"
              aria-label="Nous contacter par email"
              className="mt-3 flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <Mail className="size-4" />
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} ChurchOS. Tous droits réservés.</span>
          <span>Une solution au service du Corps de Christ.</span>
        </div>
      </div>
    </footer>
  );
}
