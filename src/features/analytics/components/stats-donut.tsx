"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface DonutRow {
  key: string;
  label: string;
  value: number;
  color: string;
}

/** Anneau + légende (valeur et part en %) ; le total s'affiche au centre. */
export function StatsDonut({
  rows,
  centerLabel,
  emptyMessage = "Aucune donnée sur cette période.",
  stacked = false,
}: {
  rows: DonutRow[];
  centerLabel: string;
  emptyMessage?: string;
  /** Légende sous l'anneau (panneaux étroits) plutôt qu'à sa droite. */
  stacked?: boolean;
}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  if (total === 0) {
    return <p className="flex h-[190px] items-center justify-center text-center text-sm text-slate-400">{emptyMessage}</p>;
  }

  return (
    <div className={stacked ? "flex flex-col items-center gap-4" : "flex flex-col items-center gap-4 sm:flex-row"}>
      <div className="relative size-[170px] shrink-0">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="label" innerRadius={55} outerRadius={82} paddingAngle={2} stroke="none">
              {rows.map((r) => (
                <Cell key={r.key} fill={r.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-navy">{total}</span>
          <span className="text-xs text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex w-full flex-1 flex-col gap-2.5 text-sm">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
              {r.label}
            </span>
            <span className="font-semibold text-navy">{r.value}</span>
            <span className="w-10 text-right text-xs text-slate-400">{Math.round((r.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
