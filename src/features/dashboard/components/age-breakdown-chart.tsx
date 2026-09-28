"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const BUCKET_ORDER = ["children", "youth", "adult", "senior"] as const;

const BUCKET_LABELS: Record<(typeof BUCKET_ORDER)[number], string> = {
  children: "Enfants (0-12)",
  youth: "Jeunes (13-25)",
  adult: "Adultes (26-59)",
  senior: "Seniors (60+)",
};

const BUCKET_COLORS: Record<(typeof BUCKET_ORDER)[number], string> = {
  children: "#3B82F6",
  youth: "#F59E0B",
  adult: "#16A34A",
  senior: "#DC2626",
};

export function AgeBreakdownChart({ data }: { data: { bucket: string; value: number }[] }) {
  const byBucket = new Map(data.map((d) => [d.bucket, d.value]));
  const rows = BUCKET_ORDER.map((bucket) => ({ bucket, value: byBucket.get(bucket) ?? 0 }));
  const total = rows.reduce((sum, r) => sum + r.value, 0);

  if (total === 0) {
    return (
      <p className="flex h-[230px] items-center justify-center text-center text-sm text-slate-400">
        Aucun membre actif avec une date de naissance renseignée.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-[190px] shrink-0">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="bucket" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
              {rows.map((r) => (
                <Cell key={r.bucket} fill={BUCKET_COLORS[r.bucket]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, _name, entry) => [`${value}`, BUCKET_LABELS[entry.payload.bucket as keyof typeof BUCKET_LABELS]]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-navy">{total}</span>
          <span className="text-xs text-slate-400">membres</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        {rows.map((r) => (
          <div key={r.bucket} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: BUCKET_COLORS[r.bucket] }} />
              {BUCKET_LABELS[r.bucket]}
            </span>
            <span className="font-medium text-navy">
              {r.value} <span className="text-slate-400">({Math.round((r.value / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
