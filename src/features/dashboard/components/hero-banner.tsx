import Image from "next/image";

import churchImage from "@/img/eglise.png";

function formatToday() {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function HeroBanner({ firstName, organizationName }: { firstName: string; organizationName: string }) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl">
      <Image src={churchImage} alt="" fill priority className="-z-10 object-cover" sizes="100vw" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/95 via-navy/75 to-navy/30" />

      <div className="flex min-h-[220px] flex-col justify-between gap-8 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Bonjour {firstName} ! 👋</h1>
            <p className="mt-1 text-lg font-semibold text-white/90">Bienvenue dans votre espace ChurchOS.</p>
            <p className="mt-2 max-w-md text-sm text-white/70">
              Ensemble, organisons, servons et faisons grandir la communauté de l&apos;{organizationName}.
            </p>
          </div>

          <div className="text-right text-white/90">
            <p className="italic">
              « Car tout se fait avec bienséance
              <br className="hidden sm:block" /> et avec ordre. »
            </p>
            <p className="mt-1 text-sm text-white/60">1 Corinthiens 14:40</p>
          </div>
        </div>

        <div className="self-end rounded-xl bg-navy/70 px-4 py-3 text-right backdrop-blur-sm">
          <p className="text-sm font-semibold text-white">{formatToday()}</p>
          <p className="text-xs text-white/70">Que cette journée soit remplie de grâce !</p>
        </div>
      </div>
    </div>
  );
}
