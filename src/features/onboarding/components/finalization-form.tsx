"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Crown, Pencil, Settings, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { finalizeOnboarding, type OnboardingActionState } from "@/features/onboarding/actions";
import { useOnboardingStore } from "@/features/onboarding/store";
import {
  ADMIN_ROLES,
  CHURCH_TYPES,
  CURRENCIES,
  DATE_FORMATS,
  MODULE_OPTIONS,
  SERVICE_DAYS,
  getCountry,
} from "@/features/onboarding/constants";

const initialState: OnboardingActionState = {};

function labelOf<T extends { value: string; label: string }>(options: readonly T[], value: string) {
  return options.find((o) => o.value === value)?.label ?? value;
}

function SummaryCard({
  icon: Icon,
  title,
  editHref,
  children,
}: {
  icon: React.ElementType;
  title: string;
  editHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-navy/5 text-navy">
            <Icon className="size-3.5" />
          </span>
          <p className="text-sm font-medium text-navy">{title}</p>
        </div>
        <Link
          href={editHref}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          <Pencil className="size-3" />
          Modifier
        </Link>
      </div>
      <dl className="flex flex-col gap-1.5 text-sm">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-400">{label}</dt>
      <dd className="truncate font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export function FinalizationForm() {
  const router = useRouter();
  const onboarding = useOnboardingStore();
  const [state, formAction, pending] = useActionState(finalizeOnboarding, initialState);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    // Attend la réhydratation (sessionStorage) avant de conclure que le brouillon est vide,
    // sinon redirection à tort le temps d'un rendu — voir la même note dans configuration-form.
    if (onboarding._hasHydrated && !onboarding.churchName) router.replace("/onboarding/church");
  }, [onboarding._hasHydrated, onboarding.churchName, router]);

  if (!onboarding._hasHydrated || !onboarding.churchName) return null;

  const country = getCountry(onboarding.countryCode);
  const modulesEnabled = MODULE_OPTIONS.filter(
    (m) => m.alwaysOn || onboarding.modules.includes(m.key),
  );
  const isPaidPlan = onboarding.planCode === "PRO" || onboarding.planCode === "ENTERPRISE";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-2xl font-semibold text-navy">Finaliser la création de votre espace</h2>
      <p className="mt-1 text-sm text-slate-500">
        Vérifiez les informations ci-dessous avant de créer votre espace. Vous pourrez toujours
        les modifier plus tard.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-5">
        <input type="hidden" name="churchName" value={onboarding.churchName} />
        <input type="hidden" name="slug" value={onboarding.slug} />
        <input type="hidden" name="denomination" value={onboarding.denomination} />
        <input type="hidden" name="countryCode" value={onboarding.countryCode} />
        <input type="hidden" name="city" value={onboarding.city} />
        <input type="hidden" name="address" value={onboarding.address} />
        <input type="hidden" name="churchPhone" value={onboarding.churchPhone} />
        <input type="hidden" name="churchEmail" value={onboarding.churchEmail} />
        <input type="hidden" name="website" value={onboarding.website} />
        <input type="hidden" name="timezone" value={onboarding.timezone} />
        <input type="hidden" name="currency" value={onboarding.currency} />
        <input type="hidden" name="dateFormat" value={onboarding.dateFormat} />
        <input type="hidden" name="campusCount" value={onboarding.campusCount} />
        <input type="hidden" name="campusName" value={onboarding.campusName} />
        <input type="hidden" name="adminRole" value={onboarding.adminRole} />
        <input type="hidden" name="modules" value={onboarding.modules.join(",")} />
        <input type="hidden" name="planCode" value={onboarding.planCode} />
        <input type="hidden" name="billingInterval" value={onboarding.billingInterval} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard icon={Building2} title="Informations de l'église" editHref="/onboarding/church">
            <Row label="Nom de l'église" value={onboarding.churchName} />
            <Row label="Dénomination" value={onboarding.denomination} />
            <Row label="Pays" value={`${country.flag} ${country.name}`} />
            <Row label="Ville" value={onboarding.city} />
            <Row label="Téléphone" value={onboarding.churchPhone} />
            <Row label="Email" value={onboarding.churchEmail} />
          </SummaryCard>

          <SummaryCard icon={User} title="Administrateur" editHref="/onboarding/admin">
            <Row
              label="Nom complet"
              value={`${onboarding.adminFirstName} ${onboarding.adminLastName}`.trim()}
            />
            <Row label="Rôle" value={labelOf(ADMIN_ROLES, onboarding.adminRole)} />
            <Row label="Téléphone" value={onboarding.adminPhone} />
            <Row label="Email" value={onboarding.adminEmail} />
          </SummaryCard>

          <SummaryCard icon={Settings} title="Configuration" editHref="/onboarding/configuration">
            <Row label="Nombre de campus" value={onboarding.campusCount} />
            <Row label="Campus principal" value={onboarding.campusName} />
            <Row label="Type d'église" value={labelOf(CHURCH_TYPES, onboarding.churchType)} />
            <Row label="Jour de culte" value={labelOf(SERVICE_DAYS, onboarding.serviceDay)} />
            <Row label="Devise" value={labelOf(CURRENCIES, onboarding.currency)} />
            <Row label="Format de date" value={labelOf(DATE_FORMATS, onboarding.dateFormat)} />
            <div className="pt-1">
              <dt className="mb-1 text-slate-400">Modules</dt>
              <dd className="flex flex-wrap gap-1">
                {modulesEnabled.map((m) => (
                  <span
                    key={m.key}
                    className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  >
                    {m.label}
                  </span>
                ))}
              </dd>
            </div>
          </SummaryCard>

          <SummaryCard icon={Crown} title="Abonnement" editHref="/onboarding/subscription">
            <Row label="Plan choisi" value={onboarding.planCode} />
            <Row
              label="Facturation"
              value={onboarding.billingInterval === "yearly" ? "Annuelle" : "Mensuelle"}
            />
            {isPaidPlan && (
              <p className="mt-2 rounded-lg bg-gold/10 px-3 py-2 text-xs text-navy">
                Vous avez choisi une solution complète pour une gestion efficace de votre église.
              </p>
            )}
          </SummaryCard>
        </div>

        {/* Contrôlé : un `<form action={...}>` réinitialise les champs non contrôlés après
         * chaque tentative de soumission, y compris en cas d'erreur serveur (RPC, RLS...). */}
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <Checkbox checked={acceptTerms} onCheckedChange={setAcceptTerms} required className="mt-0.5" />
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

        <div className="flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={() => router.push("/onboarding/subscription")}>
            Précédent
          </Button>
          <Button type="submit" disabled={pending} size="lg">
            {pending ? "Création en cours..." : "Créer mon espace ChurchOS"}
          </Button>
        </div>
      </form>
    </div>
  );
}
