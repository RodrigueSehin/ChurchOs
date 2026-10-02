import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, HandCoins, PlayCircle, ShieldCheck, Sparkles, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import churchImage from "@/img/eglise.png";

/** Délai d'entrée (ms) de chaque élément du hero, pour un enchaînement fluide. */
const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` });

const FLOATING_CARDS = [
  { icon: UserPlus, label: "Nouveau membre", hint: "Profil créé", color: "bg-blue-100 text-blue-600", position: "left-3 top-6 sm:-left-6", motion: "animate-float" },
  { icon: CalendarDays, label: "Culte du dimanche", hint: "Planning confirmé", color: "bg-green-100 text-green-600", position: "right-3 top-1/2 sm:-right-6", motion: "animate-float-slow" },
  { icon: HandCoins, label: "Don enregistré", hint: "Reçu envoyé", color: "bg-amber-100 text-amber-600", position: "bottom-6 left-6", motion: "animate-float" },
] as const;

const TRUST_ITEMS = ["Simple à utiliser", "Sécurisé et fiable", "Adapté à toutes les églises"];

export function HeroSection() {
  return (
    <section id="accueil" className="relative isolate mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      {/* Halos lumineux animés en arrière-plan */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-0 size-72 animate-blob rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -right-16 top-24 size-80 animate-blob rounded-full bg-amber-200/50 blur-3xl [animation-delay:-5s]" />
        <div className="absolute bottom-0 left-1/3 size-64 animate-blob rounded-full bg-purple-200/40 blur-3xl [animation-delay:-9s]" />
      </div>
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <span style={delay(50)} className="inline-flex animate-fade-up items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5 animate-pulse" />
            Une église mieux organisée, un plus grand impact
          </span>
          <h1 style={delay(150)} className="mt-4 animate-fade-up text-4xl font-bold leading-tight text-navy sm:text-5xl">
            Simplifiez la gestion de votre église avec <span className="text-gradient-animated animate-gradient-x">ChurchOS</span>
          </h1>
          <p style={delay(280)} className="mt-4 max-w-lg animate-fade-up text-base text-slate-600">
            Une solution complète et moderne pour gérer vos membres, ministères, événements, finances et bien
            plus encore. Concentrez-vous sur l&apos;essentiel : la mission de l&apos;Évangile.
          </p>
          <div style={delay(400)} className="mt-6 flex animate-fade-up flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-navy transition-all duration-300 hover:-translate-y-0.5 hover:bg-navy/90 hover:shadow-lg hover:shadow-navy/25 active:translate-y-0">
              <Link href="/onboarding/church" className="group">
                Commencer gratuitement
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0">
              <a href="#fonctionnalites">
                <PlayCircle className="size-4" />
                Voir la démo
              </a>
            </Button>
          </div>
          <div style={delay(520)} className="mt-6 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            {TRUST_ITEMS.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-success" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div style={delay(250)} className="relative animate-fade-up">
          <div className="relative isolate aspect-[4/3] overflow-hidden rounded-2xl shadow-card ring-1 ring-slate-200/60">
            <Image src={churchImage} alt="Église au coucher du soleil" fill className="animate-ken-burns object-cover" priority sizes="(min-width: 1024px) 50vw, 100vw" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy/25 via-transparent to-transparent" />
          </div>
          {FLOATING_CARDS.map((card, i) => (
            <div key={card.label} style={delay(700 + i * 150)} className={`absolute ${card.position} animate-fade-in`}>
              <div className={`flex items-center gap-2.5 rounded-xl border border-white/70 bg-white/90 px-3 py-2 shadow-lg backdrop-blur ${card.motion}`}>
                <span className={`flex size-8 items-center justify-center rounded-lg ${card.color}`}>
                  <card.icon className="size-4" />
                </span>
                <span className="text-left">
                  <span className="block text-xs font-semibold text-navy">{card.label}</span>
                  <span className="block text-[11px] text-slate-500">{card.hint}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
