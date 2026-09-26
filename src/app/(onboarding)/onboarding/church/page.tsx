"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { useOnboardingStore } from "@/features/onboarding/store";
import { churchInfoSchema } from "@/features/onboarding/schemas";
import { COUNTRIES, getCountry } from "@/features/onboarding/constants";
import { OnboardingHydratedGate } from "@/features/onboarding/components/hydrated-gate";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function OnboardingChurchPage() {
  return (
    <OnboardingHydratedGate>
      <ChurchForm />
    </OnboardingHydratedGate>
  );
}

function ChurchForm() {
  const router = useRouter();
  const church = useOnboardingStore();
  const [form, setForm] = useState({
    churchName: church.churchName,
    slug: church.slug,
    denomination: church.denomination,
    countryCode: church.countryCode || "CI",
    city: church.city,
    address: church.address,
    churchPhone: church.churchPhone,
    churchEmail: church.churchEmail,
    website: church.website,
    timezone: church.timezone || getCountry(church.countryCode || "CI").timezone,
  });
  const [timezoneEdited, setTimezoneEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleNameChange(value: string) {
    set("churchName", value);
    set("slug", slugify(value));
  }

  function handleCountryChange(code: string) {
    set("countryCode", code);
    if (!timezoneEdited) set("timezone", getCountry(code).timezone);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = churchInfoSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setError(null);
    church.setChurch(parsed.data);
    router.push("/onboarding/admin");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-2xl font-semibold text-navy">Créer votre église sur ChurchOS</h2>
      <p className="mt-1 text-sm text-slate-500">
        Remplissez les informations ci-dessous pour commencer.
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-navy">
        <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Vous créez un espace sécurisé et personnalisé pour votre église. Vous pourrez ensuite
          inviter d&apos;autres responsables et configurer les différents modules.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <p className="text-sm font-medium text-navy">Informations de l&apos;église</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="churchName">Nom de l&apos;église *</Label>
            <IconInput
              icon={Building2}
              id="churchName"
              value={form.churchName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex : Église Évangélique la Source"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="denomination">Dénomination / Vision (optionnel)</Label>
            <Input
              id="denomination"
              value={form.denomination}
              onChange={(e) => set("denomination", e.target.value)}
              placeholder="Ex : Ministère Évangélique et Prophétique"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="countryCode">Pays *</Label>
            <FormSelect
              id="countryCode"
              value={form.countryCode}
              onChange={(e) => handleCountryChange(e.target.value)}
              required
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Ville *</Label>
            <IconInput
              icon={MapPin}
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Ex : Abidjan"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">Adresse complète (optionnel)</Label>
          <IconInput
            icon={MapPin}
            id="address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Ex : Riviera Palmeraie, Abidjan"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="churchPhone">Téléphone *</Label>
            <IconInput
              icon={Phone}
              id="churchPhone"
              type="tel"
              value={form.churchPhone}
              onChange={(e) => set("churchPhone", e.target.value)}
              placeholder="+225 07 07 07 07 07"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="churchEmail">Email officiel *</Label>
            <IconInput
              icon={Mail}
              id="churchEmail"
              type="email"
              value={form.churchEmail}
              onChange={(e) => set("churchEmail", e.target.value)}
              placeholder="contact@votreeglise.org"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="website">Site web (optionnel)</Label>
            <IconInput
              icon={Globe}
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://www.votreeglise.org"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="timezone">Fuseau horaire *</Label>
            <FormSelect
              id="timezone"
              value={form.timezone}
              onChange={(e) => {
                setTimezoneEdited(true);
                set("timezone", e.target.value);
              }}
              required
            >
              {Array.from(new Set([form.timezone, ...COUNTRIES.map((c) => c.timezone)])).map(
                (tz) => (
                  <option key={tz} value={tz}>
                    ({formatOffset(tz)}) {tz.split("/")[1]?.replace("_", " ")}
                  </option>
                ),
              )}
            </FormSelect>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-2 flex items-center justify-end">
          <Button type="submit" size="lg">
            Suivant
          </Button>
        </div>
      </form>
    </div>
  );
}

function formatOffset(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("fr", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const part = formatter.formatToParts(new Date()).find((p) => p.type === "timeZoneName");
    return part?.value.replace("GMT", "GMT") ?? "GMT+0";
  } catch {
    return "GMT+0";
  }
}
