"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { pastelStyleFor } from "@/lib/color-hash";

export function ServiceTypeDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucun type de service renseigné.</p>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[140px] shrink-0">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={pastelStyleFor(d.name).dot} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-navy">{total}</span>
          <span className="text-xs text-slate-400">Services</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-600">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: pastelStyleFor(d.name).dot }} />
              {d.name}
            </span>
            <span className="shrink-0 font-medium text-navy">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
