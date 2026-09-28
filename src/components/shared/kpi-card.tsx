import { ArrowDown, ArrowUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: React.ElementType;
  iconClassName: string;
  label: string;
  value: string;
  /** Variation numérique (signée) affichée — le signe pilote la couleur/flèche (vert/haut si ≥ 0,
   * rouge/bas sinon), comme sur la maquette (ex. "Dépenses -5%" en rouge, flèche vers le bas).
   * Omise (`undefined`) = pas de ligne de variation du tout (ex. "Nouveaux membres ce mois-ci",
   * un simple compteur sans comparaison). */
  delta?: number;
  deltaSuffix?: string;
  extraSuffix?: string;
  periodLabel?: string;
}

export function KpiCard({ icon: Icon, iconClassName, label, value, delta, deltaSuffix = "%", extraSuffix, periodLabel }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  const ArrowIcon = positive ? ArrowUp : ArrowDown;

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center gap-2.5">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", iconClassName)}>
            <Icon className="size-4.5" />
          </span>
          <p className="text-sm font-medium text-slate-500">{label}</p>
        </div>
        <p className="mt-2.5 text-2xl font-bold text-navy">{value}</p>
        {delta !== undefined && (
          <p className="mt-1 flex items-center gap-1 text-xs">
            <span className={cn("flex items-center gap-0.5 font-medium", positive ? "text-success" : "text-danger")}>
              <ArrowIcon className="size-3" />
              {positive ? "+" : ""}
              {delta}
              {deltaSuffix}
            </span>
            {extraSuffix && <span className="text-slate-400">{extraSuffix}</span>}
          </p>
        )}
        {periodLabel && <p className="text-xs text-slate-400">{periodLabel}</p>}
      </CardContent>
    </Card>
  );
}
