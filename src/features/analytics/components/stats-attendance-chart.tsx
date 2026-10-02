"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { monthLabel } from "./month-label";

const SERIES = [
  { key: "adults", label: "Adultes", color: "#3B82F6" },
  { key: "youth", label: "Jeunes", color: "#A855F7" },
  { key: "children", label: "Enfants", color: "#F59E0B" },
  { key: "visitors", label: "Visiteurs", color: "#16A34A" },
] as const;

interface Row {
  month: string;
  adults: number;
  youth: number;
  children: number;
  visitors: number;
}

export function StatsAttendanceChart({ data }: { data: Row[] }) {
  const chartData = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  const empty = data.every((d) => d.adults + d.youth + d.children + d.visitors === 0);

  if (empty) {
    return <p className="flex h-[220px] items-center justify-center text-center text-sm text-slate-400">Aucune présence enregistrée sur cette période.</p>;
  }

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={40} />
          <Tooltip labelStyle={{ color: "#1e293b" }} />
          {SERIES.map((s) => (
            <Line key={s.key} type="monotone" name={s.label} dataKey={s.key} stroke={s.color} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
