"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCompact, formatMoney } from "@/features/finance/format";

interface Row {
  categoryName: string;
  planned: number;
  actual: number;
}

const MAX_CATEGORIES = 8;

/** Barres groupées prévu / engagé par catégorie (les budgets ne sont pas ventilés par mois). */
export function BudgetsExecutionChart({ rows, currency }: { rows: Row[]; currency: string }) {
  if (rows.length === 0) return <p className="py-16 text-center text-sm text-slate-400">Aucune ligne budgétaire sur cet exercice.</p>;

  const data = rows.slice(0, MAX_CATEGORIES).map((r) => ({
    label: r.categoryName.length > 12 ? `${r.categoryName.slice(0, 11)}…` : r.categoryName,
    name: r.categoryName,
    "Budget prévu": r.planned,
    "Dépenses réelles": r.actual,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-600" />
          Budget prévu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-amber-500" />
          Dépenses réelles
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(v: number) => formatCompact(v)} />
          <Tooltip formatter={(v) => formatMoney(Number(v), currency)} labelFormatter={(_, payload) => payload?.[0]?.payload?.name ?? ""} cursor={{ fill: "#F1F5F9" }} />
          <Bar dataKey="Budget prévu" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="Dépenses réelles" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
