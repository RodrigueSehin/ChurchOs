"use client";

import { useState } from "react";
import Link from "next/link";
import { Church, Menu, Settings } from "lucide-react";

import { NavList } from "@/components/shared/nav-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
            <Church className="size-4" />
          </span>
          <SheetTitle className="text-base font-semibold text-navy">ChurchOS</SheetTitle>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-slate-200 p-3">
          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-navy"
          >
            <Settings className="size-4 shrink-0" />
            <span>Paramètres</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
