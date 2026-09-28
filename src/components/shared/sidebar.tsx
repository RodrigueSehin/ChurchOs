import Image from "next/image";
import Link from "next/link";
import { Church, Settings } from "lucide-react";

import logo from "@/img/logo_churchos_dark.png";
import { NavList } from "@/components/shared/nav-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
  return (
    <TooltipProvider delayDuration={100}>
      <aside className="hidden shrink-0 flex-col bg-navy md:flex md:w-16 lg:w-64">
        <Link href="/dashboard" className="flex shrink-0 items-center justify-center border-b border-white/10 px-4 py-4 lg:justify-start lg:px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-gold lg:hidden">
            <Church className="size-4" />
          </span>
          <Image src={logo} alt="ChurchOS" priority className="hidden h-auto w-44 lg:block" />
        </Link>

        <ScrollArea className="flex-1">
          <div className="lg:hidden">
            <NavList iconOnly />
          </div>
          <div className="hidden lg:block">
            <NavList />
          </div>
        </ScrollArea>

        <div className="border-t border-white/10 p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white lg:px-3"
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
