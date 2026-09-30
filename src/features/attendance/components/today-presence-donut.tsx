"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { getTodayPresenceBreakdown } from "@/features/attendance/queries";

type Breakdown = Awaited<ReturnType<typeof getTodayPresenceBreakdown>>;

const COLORS: Record<string, string> = {
  Membres: "#16a34a",
  Visiteurs: "#2563eb",
  Autres: "#94a3b8",
};

export function TodayPresenceDonut({ breakdown }: { breakdown: Breakdown }) {
  const data = [
    { name: "Membres", value: breakdown.members },
    { name: "Visiteurs", value: breakdown.visitors },
    { name: "Autres", value: breakdown.others },
  ].filter((d) => d.value > 0);

  if (breakdown.total === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucune présence enregistrée aujourd&apos;hui.</p>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[140px] shrink-0">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-navy">{breakdown.total}</span>
          <span className="text-xs text-slate-400">Présences</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-600">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[d.name] }} />
              {d.name}
            </span>
            <span className="shrink-0 font-medium text-navy">
              {d.value} <span className="text-slate-400">({Math.round((d.value / breakdown.total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
