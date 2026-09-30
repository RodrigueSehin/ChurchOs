export const DONUT_COLORS = ["#2563eb", "#f59e0b", "#a855f7", "#ef4444", "#22c55e", "#64748b"];

/** Anneau multi-segments (SVG) avec total au centre et légende. Rien à afficher sans données. */
export function DonutChart({ data, centerLabel }: { data: { title: string; value: number }[]; centerLabel: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const segments = data.map((d, i) => {
    const length = total === 0 ? 0 : (d.value / total) * circumference;
    const offset = data.slice(0, i).reduce((sum, prev) => sum + (total === 0 ? 0 : (prev.value / total) * circumference), 0);
    return { ...d, length, offset, color: DONUT_COLORS[i % DONUT_COLORS.length]! };
  });

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" role="img" aria-label={`${total} ${centerLabel}`}>
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="14" className="stroke-slate-100" />
          {segments.map((s) => (
            <circle
              key={s.title}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="14"
              stroke={s.color}
              strokeDasharray={`${s.length} ${circumference - s.length}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-navy">{total}</span>
          <span className="text-[10px] text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        {segments.map((s) => (
          <li key={s.title} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-slate-600">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.title}</span>
            </span>
            <span className="font-semibold text-navy">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
