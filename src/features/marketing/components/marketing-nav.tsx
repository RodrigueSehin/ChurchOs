"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import logo from "@/img/logo_churchos.png";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#accueil", label: "Accueil" },
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#temoignages", label: "Témoignages" },
  { href: "#faq", label: "FAQ" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Ombre et fond plus marqués dès que la page défile.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-50 border-b backdrop-blur transition-all duration-300", scrolled ? "border-slate-200 bg-white/95 shadow-md" : "border-slate-100 bg-white/80")}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="#accueil" className="flex items-center gap-2">
          <Image src={logo} alt="ChurchOS" className="h-8 w-auto transition-transform duration-300 hover:scale-105" priority />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="group relative py-1 transition-colors hover:text-navy">
              {link.label}
              <span aria-hidden className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-amber-400 transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button asChild size="sm" className="bg-navy hover:bg-navy/90">
            <Link href="/onboarding/church">Commencer maintenant →</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center rounded-lg text-navy md:hidden"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="animate-slide-down border-t border-slate-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-slate-600">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="hover:text-navy">
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild size="sm" className="bg-navy hover:bg-navy/90">
              <Link href="/onboarding/church">Commencer maintenant →</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
