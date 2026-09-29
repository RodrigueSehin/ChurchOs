import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import churchImage from "@/img/eglise.png";

export function CtaBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="relative isolate overflow-hidden rounded-2xl">
        <Image src={churchImage} alt="" fill className="-z-10 object-cover" sizes="100vw" />
        <div className="absolute inset-0 -z-10 bg-navy/80" />

        <div className="flex flex-col items-center gap-4 px-6 py-14 text-center text-white sm:px-12">
          <h2 className="max-w-2xl text-3xl font-bold">Prêt à faire passer votre église au niveau supérieur ?</h2>
          <p className="max-w-xl text-white/80">
            Rejoignez les églises qui utilisent déjà ChurchOS pour mieux servir leur communauté.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-amber-400 text-navy hover:bg-amber-400/90">
              <Link href="/onboarding/church">
                Commencer gratuitement
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
              <a href="mailto:support@churchos.app">
                <Calendar className="size-4" />
                Planifier une démo
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
