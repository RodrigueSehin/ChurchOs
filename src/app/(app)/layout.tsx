import { Breadcrumb } from "@/components/shared/breadcrumb";
import { Footer } from "@/components/shared/footer";
import { Sidebar } from "@/components/shared/sidebar";
import { Topbar } from "@/components/shared/topbar";
import { requireOrganization, requireUser } from "@/lib/auth/session";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const current = await requireOrganization(user.id);

  const displayName =
    user.profile?.displayName ??
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ??
    user.email;

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          organizationName={current.organization.name}
          organizationCity={current.organization.city}
          userName={displayName || user.email}
          userRole={current.membership.title}
          userInitials={initialsOf(displayName || user.email)}
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
