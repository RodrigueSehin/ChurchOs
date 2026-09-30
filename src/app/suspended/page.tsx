import { PauseCircle } from "lucide-react";

import { logout } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { requireUser, getCurrentOrganization } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SuspendedPage() {
  const user = await requireUser();
  const current = await getCurrentOrganization(user.id);
  // Église non (ou plus) suspendue : inutile de rester sur cette page.
  if (!current || current.organization.status !== "suspended") redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <PauseCircle className="size-7" />
        </span>
        <h1 className="text-2xl font-semibold text-navy">Compte suspendu</h1>
        <p className="text-sm text-slate-500">
          L&apos;accès de <strong>{current.organization.name}</strong> à ChurchOS est temporairement suspendu. Contactez
          le support pour le réactiver.
        </p>
        <form action={logout}>
          <Button type="submit" variant="outline">
            Se déconnecter
          </Button>
        </form>
      </div>
    </main>
  );
}
