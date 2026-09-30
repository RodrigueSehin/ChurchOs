"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { DONUT_COLORS, formatCompact, formatMoney } from "@/features/finance/format";

interface Row {
  categoryName: string;
  total: number;
}

const MAX_SLICES = 4;

export function DonationsCategoryDonut({ rows, currency }: { rows: Row[]; currency: string }) {
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.categoryName, (totals.get(r.categoryName) ?? 0) + r.total);
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const grand = ranked.reduce((sum, [, v]) => sum + v, 0);

  if (grand === 0) return <p className="py-10 text-center text-sm text-slate-400">Aucun don enregistré sur cette période.</p>;

  const head = ranked.slice(0, MAX_SLICES);
  const rest = ranked.slice(MAX_SLICES).reduce((sum, [, v]) => sum + v, 0);
  const slices = [...head.map(([name, value]) => ({ name, value })), ...(rest > 0 ? [{ name: "Autres", value: rest }] : [])];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative size-[170px] shrink-0">
        <ResponsiveContainer width="100%" height={170}>
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={2} stroke="none">
              {slices.map((s, i) => (
                <Cell key={s.name} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatMoney(Number(v), currency)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-navy">{formatCompact(grand)}</span>
          <span className="text-xs text-slate-400">{currency === "XOF" || currency === "XAF" ? "FCFA" : currency}</span>
        </div>
      </div>

      <div className="flex w-full flex-1 flex-col gap-2">
        {slices.map((s, i) => (
          <div key={s.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate text-slate-600">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
              {s.name}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="text-slate-400">{Math.round((s.value / grand) * 100)}%</span>
              <span className="w-24 text-right font-medium text-navy">{new Intl.NumberFormat("fr-FR").format(Math.round(s.value))}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
