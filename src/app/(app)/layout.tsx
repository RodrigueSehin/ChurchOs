import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Footer } from "@/components/shared/footer";
import { cookies } from "next/headers";

import { Sidebar } from "@/components/shared/sidebar";
import { SIDEBAR_COOKIE } from "@/components/shared/sidebar-state";
import { Topbar } from "@/components/shared/topbar";
import { isPlatformAdmin } from "@/lib/auth/platform";
import { redirect } from "next/navigation";

import { requireOrganization, requireUser } from "@/lib/auth/session";
import { getAllowedNavHrefs } from "@/lib/navigation";
import { resolveMembershipContext } from "@/lib/rbac/resolve";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Mot de passe temporaire généré par l'administrateur : à remplacer avant d'utiliser l'application.
  if (user.mustChangePassword) redirect("/reset-password/update");
  const current = await requireOrganization(user.id);
  const platformAdmin = await isPlatformAdmin(user.id);
  // Menu filtré selon les permissions : l'utilisateur ne voit que les modules auxquels il a accès.
  const access = await resolveMembershipContext(current.membership.id);
  const allowedHrefs = getAllowedNavHrefs(access.isAdmin, access.permissions);

  const defaultCollapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  const displayName =
    user.profile?.displayName ??
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ??
    user.email;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar defaultCollapsed={defaultCollapsed} allowedHrefs={allowedHrefs} isPlatformAdmin={platformAdmin} organizationName={current.organization.name} organizationLogoUrl={current.organization.logoUrl} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          allowedHrefs={allowedHrefs}
          organizationName={current.organization.name}
          organizationCity={current.organization.city}
          organizationLogoUrl={current.organization.logoUrl}
          userName={displayName || user.email}
          userRole={current.membership.title}
          userInitials={initialsOf(displayName || user.email)}
          userAvatarUrl={user.profile?.avatarUrl}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <Breadcrumb />
            {children}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
