"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Mail, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { PhoneInput } from "@/components/shared/phone-input";
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordChecklist } from "@/features/auth/components/password-checklist";
import { createAdminAccount, type CreateAdminState } from "@/features/onboarding/actions/create-admin";
import { useOnboardingStore } from "@/features/onboarding/store";
import { ADMIN_ROLES, getCountry } from "@/features/onboarding/constants";

const initialState: CreateAdminState = {};

/**
 * Étape 1 pas encore complétée — pas de garde serveur possible ici (page publique). On attend
 * la réhydratation du store (`_hasHydrated`, sessionStorage) avant de conclure que le brouillon
 * est vide, sinon ce garde se déclencherait à tort le temps d'un rendu. `AdminFormFields` (les
 * champs, initialisés depuis le store via `useState`) ne monte qu'une fois ce garde passé, pour
 * que ses valeurs initiales soient les vraies valeurs du brouillon, pas les valeurs par défaut.
 */
export function AdminForm() {
  const router = useRouter();
  const hydrated = useOnboardingStore((s) => s._hasHydrated);
  const churchName = useOnboardingStore((s) => s.churchName);

  useEffect(() => {
    if (hydrated && !churchName) router.replace("/onboarding/church");
  }, [hydrated, churchName, router]);

  if (!hydrated || !churchName) return null;
  return <AdminFormFields />;
}

function AdminFormFields() {
  const router = useRouter();
  const church = useOnboardingStore();
  const country = getCountry(church.countryCode);
  const [state, formAction, pending] = useActionState(createAdminAccount, initialState);

  const [firstName, setFirstName] = useState(church.adminFirstName);
  const [lastName, setLastName] = useState(church.adminLastName);
  const [nationalNumber, setNationalNumber] = useState(
    church.adminPhone.replace(country.dial, "").trim(),
  );
  const [email, setEmail] = useState(church.adminEmail);
  const [role, setRole] = useState(church.adminRole);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  if (state.pendingEmailConfirmation) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="size-5" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-navy">Vérifiez vos emails</h2>
        <p className="mt-2 text-sm text-slate-500">
          Un email de confirmation vient d&apos;être envoyé à <strong>{email}</strong>. Ouvrez-le
          et cliquez sur le lien pour activer votre compte, puis connectez-vous pour continuer la
          création de votre église — vos informations d&apos;église resteront en mémoire dans cet
          onglet.
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Aller à la connexion</Link>
        </Button>
      </div>
    );
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function syncStore() {
    church.setAdmin({
      adminFirstName: firstName,
      adminLastName: lastName,
      adminPhone: `${country.dial} ${nationalNumber}`.trim(),
      adminEmail: email,
      adminRole: role,
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-2xl font-semibold text-navy">Créer le compte administrateur</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ce compte sera le premier administrateur de votre église sur ChurchOS. Vous pourrez
        ensuite inviter d&apos;autres responsables.
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-navy">
        <User className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Cet administrateur aura un accès complet à l&apos;espace ChurchOS. Il pourra gérer les
          paramètres de l&apos;église, les utilisateurs et les différents modules.
        </p>
      </div>

      <form action={formAction} onSubmit={syncStore} className="mt-6 flex flex-col gap-5">
        <div>
          <p className="mb-3 text-sm font-medium text-navy">Informations personnelles</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">Prénom *</Label>
              <IconInput
                icon={User}
                id="firstName"
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex : Jean"
                autoComplete="given-name"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Nom *</Label>
              <IconInput
                icon={User}
                id="lastName"
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex : Kouassi"
                autoComplete="family-name"
                required
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Téléphone *</Label>
              <PhoneInput
                id="phone"
                name="phone"
                country={country}
                nationalNumber={nationalNumber}
                onNationalNumberChange={setNationalNumber}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email *</Label>
              <IconInput
                icon={Mail}
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex : jean.kouassi@votreeglise.org"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Rôle dans l&apos;église *</Label>
              <FormSelect
                id="role"
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              >
                {ADMIN_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="avatar">Photo de profil (optionnel)</Label>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
                  {avatarPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarPreview} alt="" className="size-full object-cover" />
                  ) : (
                    <User className="size-5" />
                  )}
                </div>
                <label className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 transition-colors hover:bg-slate-50">
                  <Camera className="size-4" />
                  Choisir une image
                  <input
                    id="avatar"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400">PNG, JPG ou JPEG (Max 2 Mo)</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <p className="mb-3 text-sm font-medium text-navy">Sécurité du compte</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Mot de passe *</Label>
              <PasswordInput
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Créez un mot de passe sécurisé"
                autoComplete="new-password"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <div className="mt-3">
            <PasswordChecklist password={password} />
          </div>
        </div>

        {/* Champs contrôlés (pas seulement password/confirmPassword) : un `<form action={...}>`
         * réinitialise les champs non contrôlés après chaque tentative de soumission (y compris
         * en cas d'erreur serveur) — vérifié en conditions réelles contre Supabase Auth. */}
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <Checkbox
            name="acceptTerms"
            checked={acceptTerms}
            onCheckedChange={setAcceptTerms}
            required
            className="mt-0.5"
          />
          <span>
            J&apos;accepte les <strong className="font-medium text-navy">Conditions d&apos;utilisation</strong> et
            la <strong className="font-medium text-navy">Politique de confidentialité</strong> de ChurchOS
          </span>
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}

        <div className="mt-1 flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={() => router.push("/onboarding/church")}>
            Précédent
          </Button>
          <Button type="submit" disabled={pending} size="lg">
            {pending ? "Création..." : "Suivant"}
          </Button>
        </div>
      </form>
    </div>
  );
}
