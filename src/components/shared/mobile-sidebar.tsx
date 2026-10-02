"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, Settings } from "lucide-react";

import logo from "@/img/logo_churchos_dark.png";
import { ChurchLogo } from "@/components/shared/church-logo";
import { NavList } from "@/components/shared/nav-list";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileSidebar({ allowedHrefs, organizationName, organizationLogoUrl }: { allowedHrefs?: string[]; organizationName?: string; organizationLogoUrl?: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col bg-navy p-0">
        <div className="flex shrink-0 items-center border-b border-white/10 px-5 py-4">
          <SheetTitle className="sr-only">{organizationLogoUrl ? (organizationName ?? "Église") : "ChurchOS"}</SheetTitle>
          {organizationLogoUrl ? (
            <ChurchLogo url={organizationLogoUrl} name={organizationName ?? "de l'église"} />
          ) : (
            <Image src={logo} alt="ChurchOS" priority className="h-auto w-40" />
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList allowedHrefs={allowedHrefs} onNavigate={() => setOpen(false)} />
        </div>
        <div className="border-t border-white/10 p-3">
          <Link
            href="/settings/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Settings className="size-4 shrink-0" />
            <span>Paramètres</span>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
