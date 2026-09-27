import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { key: "announcements", label: "Annonces" },
  { key: "templates", label: "Modèles" },
  { key: "compose", label: "Composer" },
  { key: "history", label: "Historique" },
] as const;

export function CommunicationTabs({ active }: { active: string }) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`/communication?tab=${tab.key}`}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-navy",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
