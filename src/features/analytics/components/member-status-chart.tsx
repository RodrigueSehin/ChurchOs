"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  inactive: "Inactif",
  transferred: "Transféré",
  deceased: "Décédé",
  archived: "Archivé",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#16a34a",
  inactive: "#94a3b8",
  transferred: "#f59e0b",
  deceased: "#475569",
  archived: "#cbd5e1",
};

export function MemberStatusChart({ data }: { data: { status: string; value: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: STATUS_LABELS[d.status] ?? d.status }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {chartData.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#cbd5e1"} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
