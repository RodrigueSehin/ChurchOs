"use client";

import Link from "next/link";
import { Bell, ChevronDown, Church, LogOut, Search } from "lucide-react";

import { logout } from "@/features/auth/actions";
import { ChurchLogo } from "@/components/shared/church-logo";
import { MobileSidebar } from "@/components/shared/mobile-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { settingsNav } from "@/lib/navigation";

interface TopbarProps {
  /** Entrées de menu autorisées (voir `getAllowedNavHrefs`). */
  allowedHrefs?: string[];
  organizationName: string;
  organizationCity?: string | null;
  organizationLogoUrl?: string | null;
  userName: string;
  userRole?: string | null;
  userInitials: string;
  userAvatarUrl?: string | null;
}

export function Topbar({ allowedHrefs, organizationName, organizationCity, organizationLogoUrl, userName, userRole, userInitials, userAvatarUrl }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:gap-4 sm:px-6">
      <MobileSidebar allowedHrefs={allowedHrefs} organizationName={organizationName} organizationLogoUrl={organizationLogoUrl} />

      <div className="relative hidden max-w-md flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un membre, un événement, un document..."
          className="w-full rounded-lg border border-slate-200 bg-surface py-2 pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 sm:flex">
          {organizationLogoUrl ? (
            <ChurchLogo url={organizationLogoUrl} name={organizationName} className="size-7 rounded-full border border-slate-100 p-0.5" imgClassName="max-h-6 max-w-6" />
          ) : (
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Church className="size-3.5" />
            </span>
          )}
          <div className="min-w-0 text-left">
            <p className="truncate text-xs font-semibold leading-tight text-navy">{organizationName}</p>
            {organizationCity && <p className="truncate text-[11px] leading-tight text-slate-400">{organizationCity}</p>}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <p className="px-2.5 py-4 text-center text-sm text-slate-400">
              Aucune notification pour l&apos;instant.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100">
              <Avatar>
                {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userName} />}
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium text-navy">{userName}</span>
                {userRole && <span className="block text-xs text-slate-400">{userRole}</span>}
              </span>
              <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {settingsNav.filter((item) => !allowedHrefs || allowedHrefs.includes(item.href)).map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  {item.title}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-danger outline-none transition-colors hover:bg-danger/5"
              >
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
