"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(year, month - 1, 1));
}

/** Convertit la série "nouveaux membres par mois" (Phase 13) en série cumulative dont le dernier
 * point correspond exactement au total de membres actifs affiché dans la carte KPI — évite toute
 * incohérence entre le graphique et le chiffre affiché juste au-dessus. */
export function GrowthChart({ data, currentTotal }: { data: { month: string; value: number }[]; currentTotal: number }) {
  const totalIncrements = data.reduce((sum, d) => sum + d.value, 0);
  const startValue = currentTotal - totalIncrements;
  const chartData = data.map((d, i) => ({
    label: formatMonth(d.month),
    value: startValue + data.slice(0, i + 1).reduce((sum, entry) => sum + entry.value, 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip formatter={(value) => [`${value}`, "Membres"]} labelStyle={{ color: "#1e293b" }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#2563EB"
          strokeWidth={2.5}
          fill="url(#growthFill)"
          dot={(dotProps: { cx?: number; cy?: number; index?: number; value?: number }) => {
            const { cx, cy, index, value } = dotProps;
            if (cx === undefined || cy === undefined) return <g key={`dot-${index}`} />;
            if (index !== chartData.length - 1) {
              return <circle key={`dot-${index}`} cx={cx} cy={cy} r={4} fill="#2563EB" />;
            }
            return (
              <g key={`dot-${index}`}>
                <circle cx={cx} cy={cy} r={5} fill="#2563EB" />
                <rect x={cx - 20} y={cy - 34} width={40} height={22} rx={6} fill="#0B2A4A" />
                <text x={cx} y={cy - 19} textAnchor="middle" fill="#ffffff" fontSize={12} fontWeight={700}>
                  {value}
                </text>
              </g>
            );
          }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
