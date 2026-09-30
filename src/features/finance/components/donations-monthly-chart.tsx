"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { FormSelect } from "@/components/shared/form-select";
import { formatCompact, formatMoney } from "@/features/finance/format";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const MAX_SERIES = 2;

interface Row {
  month: number;
  categoryName: string;
  total: number;
}

/** Barres empilées par mois : les 2 catégories les plus importantes de l'année + « Autres ». */
export function DonationsMonthlyChart({
  rows,
  year,
  currentYear,
  currency,
  colors = SERIES_COLORS,
  maxSeries = MAX_SERIES,
  emptyLabel = "Aucun don enregistré sur cette période.",
}: {
  rows: Row[];
  year: number;
  currentYear: number;
  currency: string;
  colors?: string[];
  maxSeries?: number;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.categoryName, (totals.get(r.categoryName) ?? 0) + r.total);
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const top = ranked.slice(0, maxSeries);
  const hasOthers = ranked.length > maxSeries;
  const seriesNames = hasOthers ? [...top, "Autres"] : top;

  const data = MONTHS.map((label, i) => {
    const point: Record<string, number | string> = { label };
    for (const name of seriesNames) point[name] = 0;
    for (const r of rows) {
      if (r.month !== i + 1) continue;
      const key = top.includes(r.categoryName) ? r.categoryName : "Autres";
      point[key] = (point[key] as number) + r.total;
    }
    return point;
  });

  function handleYear(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (Number(value) === currentYear) params.delete("year");
    else params.set("year", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {seriesNames.length > 1 && seriesNames.map((name, i) => (
            <span key={name} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: colors[i % colors.length]! }} />
              {name}
            </span>
          ))}
        </div>
        <FormSelect value={String(year)} onChange={(e) => handleYear(e.target.value)} className="w-[150px]" aria-label="Année">
          <option value={currentYear}>Cette année</option>
          <option value={currentYear - 1}>Année dernière</option>
        </FormSelect>
      </div>

      {seriesNames.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#E2E8F0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(v: number) => formatCompact(v)} />
            <Tooltip formatter={(v) => formatMoney(Number(v), currency)} cursor={{ fill: "#F1F5F9" }} />
            {seriesNames.map((name, i) => (
              <Bar key={name} dataKey={name} stackId="a" fill={colors[i % colors.length]!} radius={i === seriesNames.length - 1 ? [3, 3, 0, 0] : 0} maxBarSize={32} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

const SERIES_COLORS = ["#2563EB", "#F59E0B", "#94A3B8"];
