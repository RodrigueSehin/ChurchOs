"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FormSelect } from "@/components/shared/form-select";
import { useOnboardingStore } from "@/features/onboarding/store";
import {
  CHURCH_TYPES,
  CURRENCIES,
  DATE_FORMATS,
  MODULE_OPTIONS,
  SERVICE_DAYS,
  COUNTRIES,
} from "@/features/onboarding/constants";

/**
 * Brouillon perdu (nouvel onglet, sessionStorage vidée...) — on ne peut pas reconstruire les
 * infos de l'église, il faut recommencer l'assistant (le compte, lui, existe déjà). Attend la
 * réhydratation (`OnboardingHydratedGate`) avant de conclure que le brouillon est vide, et avant
 * de monter `ConfigurationFields` (dont les champs s'initialisent depuis le store via
 * `useState`, donc doivent voir les vraies valeurs dès le montage).
 */
export function ConfigurationForm() {
  const router = useRouter();
  const hydrated = useOnboardingStore((s) => s._hasHydrated);
  const churchName = useOnboardingStore((s) => s.churchName);

  useEffect(() => {
    if (hydrated && !churchName) router.replace("/onboarding/church");
  }, [hydrated, churchName, router]);

  if (!hydrated || !churchName) return null;
  return <ConfigurationFields />;
}

function ConfigurationFields() {
  const router = useRouter();
  const onboarding = useOnboardingStore();

  const [campusCount, setCampusCount] = useState(onboarding.campusCount);
  const [campusName, setCampusName] = useState(onboarding.campusName);
  const [churchType, setChurchType] = useState(onboarding.churchType);
  const [timezone, setTimezone] = useState(onboarding.timezone);
  const [modules, setModules] = useState<string[]>(onboarding.modules);
  const [serviceDay, setServiceDay] = useState(onboarding.serviceDay);
  const [serviceTime, setServiceTime] = useState(onboarding.serviceTime);
  const [dateFormat, setDateFormat] = useState(onboarding.dateFormat);
  const [currency, setCurrency] = useState(onboarding.currency);

  function toggleModule(key: string, enabled: boolean) {
    setModules((prev) => (enabled ? [...new Set([...prev, key])] : prev.filter((m) => m !== key)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onboarding.setConfiguration({
      campusCount,
      campusName,
      churchType,
      timezone,
      serviceDay,
      serviceTime,
      dateFormat,
      currency,
      modules,
    });
    router.push("/onboarding/subscription");
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="text-2xl font-semibold text-navy">Configurer votre église</h2>
      <p className="mt-1 text-sm text-slate-500">
        Personnalisez votre espace ChurchOS selon l&apos;organisation et les besoins de votre
        église.
      </p>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-navy">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          Vous pouvez activer les modules maintenant et les ajuster plus tard dans les
          paramètres. Ces informations nous permettent de créer un espace adapté à la réalité de
          votre église.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-8">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Building2 className="size-4 text-navy" />
            <p className="text-sm font-medium text-navy">Structure de l&apos;église</p>
          </div>
          <p className="mb-3 text-xs text-slate-400">Organisez la structure de votre église.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campusCount">Nombre de campus/assemblées</Label>
              <FormSelect
                id="campusCount"
                value={campusCount}
                onChange={(e) => setCampusCount(Number(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campusName">Nom du campus principal *</Label>
              <Input
                id="campusName"
                value={campusName}
                onChange={(e) => setCampusName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="churchType">Type d&apos;église *</Label>
              <FormSelect
                id="churchType"
                value={churchType}
                onChange={(e) => setChurchType(e.target.value)}
                required
              >
                {CHURCH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="timezone">Fuseau horaire</Label>
              <FormSelect id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {Array.from(new Set([timezone, ...COUNTRIES.map((c) => c.timezone)])).map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.split("/")[1]?.replace("_", " ")}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-1 text-sm font-medium text-navy">Modules à activer</p>
          <p className="mb-3 text-xs text-slate-400">
            Sélectionnez les modules que vous souhaitez utiliser dès maintenant.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MODULE_OPTIONS.map((mod) => {
              const enabled = mod.alwaysOn || modules.includes(mod.key);
              return (
                <div
                  key={mod.key}
                  className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-navy">{mod.label}</p>
                    <p className="text-xs text-slate-400">{mod.description}</p>
                    {mod.alwaysOn && <p className="mt-0.5 text-[11px] text-primary">Toujours inclus</p>}
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(v) => toggleModule(mod.key, v)}
                    disabled={mod.alwaysOn}
                    aria-label={mod.label}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-1 text-sm font-medium text-navy">Paramètres généraux</p>
          <p className="mb-3 text-xs text-slate-400">Quelques préférences de base pour votre espace.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceDay">Jour principal de culte</Label>
              <FormSelect id="serviceDay" value={serviceDay} onChange={(e) => setServiceDay(e.target.value)}>
                {SERVICE_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="serviceTime">Heure principale de culte</Label>
              <Input
                id="serviceTime"
                type="time"
                value={serviceTime}
                onChange={(e) => setServiceTime(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateFormat">Format de date</Label>
              <FormSelect id="dateFormat" value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                {DATE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">Devise</Label>
              <FormSelect id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Modifiable plus tard dans les paramètres de l&apos;église.
          </p>
        </section>

        <div className="flex items-center justify-between">
          <Button type="button" variant="secondary" onClick={() => router.push("/onboarding/admin")}>
            Précédent
          </Button>
          <Button type="submit" size="lg">
            Suivant
          </Button>
        </div>
      </form>
    </div>
  );
}
