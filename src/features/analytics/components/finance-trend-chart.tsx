"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number) as [number, number];
  return new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1));
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(value);
}

export function FinanceTrendChart({ data }: { data: { month: string; income: number; expense: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatMonth(d.month) }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => formatAmount(Number(v))} />
        <Tooltip formatter={(value) => formatAmount(Number(value))} labelStyle={{ color: "#1e293b" }} />
        <Legend formatter={(value) => (value === "income" ? "Recettes" : "Dépenses")} />
        <Bar dataKey="income" name="income" fill="#16a34a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="expense" fill="#dc2626" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
