"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface BarRow {
  label: string;
  value: number;
  color?: string;
}

function compact(value: number) {
  if (value >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${value}`;
}

export function StatsBarChart({
  data,
  color = "#16A34A",
  valueLabels = false,
  compactAxis = false,
  tooltipLabel = "Valeur",
  tooltipSuffix = "",
  height = 200,
}: {
  data: BarRow[];
  color?: string;
  /** Affiche la valeur au-dessus de chaque barre (graphique « Activités principales »). */
  valueLabels?: boolean;
  compactAxis?: boolean;
  tooltipLabel?: string;
  tooltipSuffix?: string;
  height?: number;
}) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="flex items-center justify-center text-center text-sm text-slate-400" style={{ height }}>Aucune donnée sur cette période.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: valueLabels ? 18 : 6, right: 4, left: compactAxis ? 0 : -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={compactAxis ? 44 : 36}
          tickFormatter={compactAxis ? compact : undefined}
        />
        <Tooltip formatter={(value) => [`${Number(value).toLocaleString("fr-FR")}${tooltipSuffix}`, tooltipLabel]} cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={36}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color ?? color} />
          ))}
          {valueLabels && <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 700, fill: "#0B2A4A" }} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
