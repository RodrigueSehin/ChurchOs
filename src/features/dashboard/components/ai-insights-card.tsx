import Link from "next/link";
import { BarChart3, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const BULLET_COLORS = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-amber-500"];

export function AiInsightsCard({ firstName, insights }: { firstName: string; insights: string[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-navy p-5 text-white">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-gold" />
          ChurchOS AI
        </p>
        <Badge className="bg-primary text-white">Nouveau</Badge>
      </div>

      <div>
        <p className="font-semibold">Bonjour {firstName} !</p>
        <p className="mt-0.5 text-sm text-white/60">Voici quelques informations réelles sur votre église aujourd&apos;hui :</p>
      </div>

      {insights.length > 0 ? (
        <ul className="flex flex-col gap-2 rounded-lg bg-white/5 p-4 text-sm">
          {insights.map((insight, i) => (
            <li key={insight} className="flex items-start gap-2">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${BULLET_COLORS[i % BULLET_COLORS.length]}`} />
              {insight}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-white/5 p-4 text-sm text-white/60">Pas encore assez de données pour générer des informations.</p>
      )}

      <Link
        href="/ai"
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <BarChart3 className="size-4" />
        Voir plus d&apos;analyses
      </Link>
    </div>
  );
}
