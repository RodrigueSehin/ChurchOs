"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompact, formatMoney } from "@/features/finance/format";

const SHORT_MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

interface Month {
  month: string;
  income: number;
  expense: number;
  cumulative: number;
}

export function ReportsMonthlyChart({ months, currency }: { months: Month[]; currency: string }) {
  const multiYear = new Set(months.map((m) => m.month.slice(0, 4))).size > 1;
  const data = months.map((m) => {
    const [y, mo] = m.month.split("-").map(Number) as [number, number];
    return { label: multiYear ? `${SHORT_MONTHS[mo - 1]} ${String(y).slice(2)}` : SHORT_MONTHS[mo - 1]!, Revenus: m.income, Dépenses: m.expense, "Solde cumulé": m.cumulative };
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-green-500" />
          Revenus
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" />
          Dépenses
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-blue-600" />
          Solde cumulé
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(v: number) => formatCompact(v)} />
          <Tooltip formatter={(v) => formatMoney(Number(v), currency)} cursor={{ fill: "#F1F5F9" }} />
          <Bar dataKey="Revenus" fill="#22C55E" radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Bar dataKey="Dépenses" fill="#F43F5E" radius={[3, 3, 0, 0]} maxBarSize={16} />
          <Line type="monotone" dataKey="Solde cumulé" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
