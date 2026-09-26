"use client";

import Link from "next/link";
import { Bell, ChevronDown, LogOut } from "lucide-react";

import { logout } from "@/features/auth/actions";
import { MobileSidebar } from "@/components/shared/mobile-sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  organizationName: string;
  organizationCity?: string | null;
  userName: string;
  userRole?: string | null;
  userInitials: string;
}

export function Topbar({ organizationName, organizationCity, userName, userRole, userInitials }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-navy">{organizationName}</p>
          {organizationCity && <p className="truncate text-xs text-slate-400">{organizationCity}</p>}
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
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
            {settingsNav.map((item) => (
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
