import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/features/marketing/components/reveal";
import churchImage from "@/img/eglise.png";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <Reveal direction="scale">
        <div className="relative isolate overflow-hidden rounded-2xl">
          <Image
            src={churchImage}
            alt=""
            fill
            className="-z-10 animate-ken-burns object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 -z-10 bg-navy/80" />
          <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute inset-y-0 w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="flex flex-col items-center gap-4 px-6 py-14 text-center text-white sm:px-12">
            <h2 className="max-w-2xl text-3xl font-bold">
              Prêt à faire passer votre église au niveau supérieur ?
            </h2>
            <p className="max-w-xl text-white/80">
              Rejoignez les églises qui utilisent déjà ChurchOS pour mieux servir leur communauté.
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <span className="relative inline-flex">
                <span
                  aria-hidden
                  className="absolute inset-0 animate-ping-soft rounded-lg bg-amber-400/60"
                />
                <Button
                  asChild
                  size="lg"
                  className="group relative bg-amber-400 text-navy transition-all duration-300 hover:-translate-y-0.5 hover:bg-amber-400/90 hover:shadow-lg hover:shadow-amber-400/30"
                >
                  <Link href="/onboarding/church">
                    Commencer gratuitement
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </span>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                <a href="mailto:support@churchos.app">
                  <Calendar className="size-4" />
                  Planifier une démo
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
