import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOrganization, requireUser } from "@/lib/auth/session";
import { resolveMembershipContext } from "@/lib/rbac/resolve";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { ChangePasswordForm } from "@/features/profile/components/change-password-form";

export default async function ProfilePage() {
  const user = await requireUser();
  const current = await requireOrganization(user.id);
  const context = await resolveMembershipContext(current.membership.id);

  const p = user.profile;
  const firstName = p?.firstName ?? "";
  const lastName = p?.lastName ?? "";
  const fullName = p?.displayName || `${firstName} ${lastName}`.trim() || user.email;
  const initials =
    `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || user.email.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profil" description="Informations personnelles et préférences du compte." />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-5">
          <Avatar className="size-16">
            {p?.avatarUrl && <AvatarImage src={p.avatarUrl} alt={fullName} />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-lg font-semibold text-navy">{fullName}</p>
            <p className="truncate text-sm text-slate-500">
              {user.email} · {current.organization.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {context.roleCodes.map((code) => (
                <Badge key={code} variant="secondary">
                  {code}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>Ces informations sont propres à votre compte.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            values={{
              firstName,
              lastName,
              email: user.email,
              phone: p?.phone ?? "",
              avatarUrl: p?.avatarUrl ?? "",
              timezone: p?.timezone ?? "Africa/Abidjan",
              currency: p?.currency ?? "XOF",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>Votre mot de passe actuel est demandé pour le modifier.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
