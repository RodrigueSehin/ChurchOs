"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { REGISTRATION_STATUS_COLORS, REGISTRATION_STATUS_LABELS } from "@/features/registrations/schemas";
import type { getRegistrationsStatusBreakdown } from "@/features/registrations/queries";

type Row = Awaited<ReturnType<typeof getRegistrationsStatusBreakdown>>[number];

export function RegistrationStatusDonut({ rows }: { rows: Row[] }) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  const data = rows.filter((r) => r.value > 0).map((r) => ({ name: REGISTRATION_STATUS_LABELS[r.status] ?? r.status, value: r.value, color: REGISTRATION_STATUS_COLORS[r.status] ?? "#94a3b8" }));

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucune inscription pour le moment.</p>;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[140px] shrink-0">
        <ResponsiveContainer width="100%" height={140}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-navy">{total}</span>
          <span className="text-xs text-slate-400">Inscriptions</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-600">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
            </span>
            <span className="shrink-0 font-medium text-navy">
              {d.value} <span className="text-slate-400">({Math.round((d.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
