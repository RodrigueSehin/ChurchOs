import { AuthPageShell } from "@/components/shared/auth-page-shell";
import { LOGIN_HERO } from "@/components/shared/auth-hero-presets";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthPageShell hero={LOGIN_HERO}>{children}</AuthPageShell>;
}
