import Link from "next/link";
import { Church, Settings } from "lucide-react";

import { NavList } from "@/components/shared/nav-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  return (
    <TooltipProvider delayDuration={100}>
      <aside className="hidden shrink-0 flex-col border-r border-slate-200 bg-white md:flex md:w-16 lg:w-64">
        <Link
          href="/dashboard"
          className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-4 lg:px-5"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
            <Church className="size-4" />
          </span>
          <span className="hidden text-base font-semibold text-navy lg:inline">ChurchOS</span>
        </Link>

        <ScrollArea className="flex-1">
          <div className="lg:hidden">
            <NavList iconOnly />
          </div>
          <div className="hidden lg:block">
            <NavList />
          </div>
        </ScrollArea>

        <div className="border-t border-slate-200 p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-navy lg:px-3"
              >
                <Settings className="size-4 shrink-0" />
                <span className="hidden truncate lg:inline">Paramètres</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Paramètres</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
