"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}

export function AttendanceTrendChart({ data }: { data: { title: string; startsAt: Date; value: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatDate(d.startsAt) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={30} />
        <Tooltip
          formatter={(value) => [`${value}`, "Présents"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.title ?? ""}
          labelStyle={{ color: "#1e293b" }}
        />
        <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
