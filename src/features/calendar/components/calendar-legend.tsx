import { pastelStyleFor } from "@/lib/color-hash";
import { CALENDAR_SOURCE_LABELS } from "@/features/calendar/schemas";
import type { CalendarEntry } from "@/features/calendar/queries";

export function CalendarLegend({ entries }: { entries: CalendarEntry[] }) {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const label = entry.category ?? CALENDAR_SOURCE_LABELS[entry.source] ?? entry.source;
    if (!seen.has(label)) seen.set(label, entry.color ?? pastelStyleFor(label).dot);
  }
  const items = [...seen.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
      {items.map(([label, color]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      ))}
    </div>
  );
}
