import { CalendarPlus, Coins, Heart, HeartHandshake, UserPlus } from "lucide-react";

import type { RecentActivityItem, RecentActivityKind } from "@/features/dashboard/queries";

const KIND_ICON: Record<RecentActivityKind, React.ElementType> = {
  member: UserPlus,
  visit: HeartHandshake,
  registration: CalendarPlus,
  offering: Coins,
  prayer: Heart,
};

const KIND_STYLE: Record<RecentActivityKind, string> = {
  member: "bg-blue-100 text-blue-600",
  visit: "bg-indigo-100 text-indigo-600",
  registration: "bg-orange-100 text-orange-600",
  offering: "bg-green-100 text-green-600",
  prayer: "bg-pink-100 text-pink-600",
};

function formatRelative(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.round(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`;
  const days = Math.round(hours / 24);
  return `il y a ${days} jour${days > 1 ? "s" : ""}`;
}

export function RecentActivityList({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">Aucune activité récente.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = KIND_ICON[item.kind];
        return (
          <div key={`${item.kind}-${item.at.toISOString()}`} className="flex items-center gap-3">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${KIND_STYLE[item.kind]}`}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-navy">{item.title}</p>
              <p className="truncate text-xs text-slate-400">{item.subtitle}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{formatRelative(item.at)}</span>
          </div>
        );
      })}
    </div>
  );
}
