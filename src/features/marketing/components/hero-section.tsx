import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import churchImage from "@/img/eglise.png";

const TRUST_ITEMS = ["Simple à utiliser", "Sécurisé et fiable", "Adapté à toutes les églises"];

export function HeroSection() {
  return (
    <section id="accueil" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            Une église mieux organisée, un plus grand impact
          </span>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-navy sm:text-5xl">
            Simplifiez la gestion de votre église avec <span className="text-amber-500">ChurchOS</span>
          </h1>
          <p className="mt-4 max-w-lg text-base text-slate-600">
            Une solution complète et moderne pour gérer vos membres, ministères, événements, finances et bien
            plus encore. Concentrez-vous sur l&apos;essentiel : la mission de l&apos;Évangile.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-navy hover:bg-navy/90">
              <Link href="/onboarding/church">
                Commencer gratuitement
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#fonctionnalites">
                <PlayCircle className="size-4" />
                Voir la démo
              </a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            {TRUST_ITEMS.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-success" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative isolate aspect-[4/3] overflow-hidden rounded-2xl shadow-card">
          <Image src={churchImage} alt="Église au coucher du soleil" fill className="object-cover" priority sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      </div>
    </section>
  );
}
