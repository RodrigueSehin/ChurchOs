import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import { Footer } from "@/components/shared/footer";
import { PlatformNav } from "@/features/platform/components/platform-nav";
import { requirePlatformAdmin } from "@/lib/auth/platform";
import { getCurrentOrganization } from "@/lib/auth/session";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformAdmin();
  const hasOrganization = Boolean(await getCurrentOrganization(user.id));

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 bg-navy px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/platform" className="flex items-center gap-2 text-white">
            <ShieldCheck className="size-5 text-gold" />
            <span className="font-semibold">ChurchOS · Administration</span>
          </Link>
          <PlatformNav />
        </div>
        <div className="flex items-center gap-4 text-sm text-white/70">
          <span className="hidden sm:inline">{user.email}</span>
          {hasOrganization && (
            <Link href="/dashboard" className="hover:text-white">
              Retour à l&apos;application
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Footer />
    </div>
  );
}
