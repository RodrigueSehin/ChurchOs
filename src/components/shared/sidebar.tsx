"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Church, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck } from "lucide-react";

import logo from "@/img/logo_churchos_dark.png";
import { ChurchLogo } from "@/components/shared/church-logo";
import { NavList } from "@/components/shared/nav-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE } from "@/components/shared/sidebar-state";

export function Sidebar({
  defaultCollapsed = false,
  allowedHrefs,
  isPlatformAdmin = false,
  organizationName,
  organizationLogoUrl,
}: {
  /** Menu réduit (icônes seules) au chargement, d'après le cookie. */
  defaultCollapsed?: boolean;
  allowedHrefs?: string[];
  isPlatformAdmin?: boolean;
  organizationName?: string;
  /** Logo de l'église : s'il existe, il remplace celui de ChurchOS dans le menu. */
  organizationLogoUrl?: string | null;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  // Sur écran large, le menu est complet (w-64) ou réduit aux icônes (w-16) ; sur tablette il est toujours réduit.
  return (
    <TooltipProvider delayDuration={100}>
      <aside className={cn("relative hidden shrink-0 flex-col bg-navy transition-[width] duration-300 ease-in-out md:flex md:w-16", collapsed ? "lg:w-16" : "lg:w-64")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Agrandir le menu" : "Réduire le menu"}
              aria-expanded={!collapsed}
              className="absolute -right-3 top-[3.25rem] z-30 hidden size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-navy shadow-md transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:flex"
            >
              {collapsed ? <PanelLeftOpen className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Agrandir le menu" : "Réduire le menu"}</TooltipContent>
        </Tooltip>
        <Link href="/dashboard" className={cn("flex shrink-0 items-center justify-center border-b border-white/10 px-4 py-4", !collapsed && "lg:justify-start lg:px-5")}>
          {organizationLogoUrl ? (
            <ChurchLogo
              url={organizationLogoUrl}
              name={organizationName ?? "de l'église"}
              className={cn("p-1", !collapsed && "lg:p-1.5")}
              imgClassName={cn("max-h-8 max-w-[2rem]", !collapsed && "lg:max-h-10 lg:max-w-[11rem]")}
            />
          ) : (
            <>
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-gold", !collapsed && "lg:hidden")}>
                <Church className="size-4" />
              </span>
              <Image src={logo} alt="ChurchOS" priority className={cn("hidden h-auto w-44", !collapsed && "lg:block")} />
            </>
          )}
        </Link>

        <ScrollArea className="flex-1">
          <div className={cn(!collapsed && "lg:hidden")}>
            <NavList allowedHrefs={allowedHrefs} iconOnly />
          </div>
          <div className={cn("hidden", !collapsed && "lg:block")}>
            <NavList allowedHrefs={allowedHrefs} />
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-1 border-t border-white/10 p-3">
          {isPlatformAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/platform"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gold hover:bg-white/10 lg:px-3"
                >
                  <ShieldCheck className="size-4 shrink-0" />
                  <span className={cn("hidden truncate", !collapsed && "lg:inline")}>Administration</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Administration ChurchOS</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings/profile"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white lg:px-3"
              >
                <Settings className="size-4 shrink-0" />
                <span className={cn("hidden truncate", !collapsed && "lg:inline")}>Paramètres</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Paramètres</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
