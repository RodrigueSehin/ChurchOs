import { connection } from "next/server";

import { AuthPageShell } from "@/components/shared/auth-page-shell";
import { getLoginHero } from "@/components/shared/auth-hero-presets";

/** `connection()` : rendu à chaque requête, sinon les pages statiques figeraient le verset du jour au build. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return <AuthPageShell hero={getLoginHero()}>{children}</AuthPageShell>;
}
