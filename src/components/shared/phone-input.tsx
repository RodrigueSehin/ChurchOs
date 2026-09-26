"use client";

import type { CountryOption } from "@/features/onboarding/constants";

export interface PhoneInputProps {
  id?: string;
  name?: string;
  country: CountryOption;
  nationalNumber: string;
  onNationalNumberChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

/** Téléphone avec indicatif pays (drapeau + code) en préfixe fixe, dérivé du pays choisi à
 * l'étape 1 — l'utilisateur ne saisit que le numéro national. */
export function PhoneInput({
  id,
  name,
  country,
  nationalNumber,
  onNationalNumberChange,
  required,
  placeholder,
}: PhoneInputProps) {
  const fullValue = `${country.dial} ${nationalNumber}`.trim();

  return (
    <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-white pr-1 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <span className="flex items-center gap-1.5 border-r border-slate-200 px-3 text-sm text-slate-600">
        <span aria-hidden>{country.flag}</span>
        {country.dial}
      </span>
      <input
        id={id}
        type="tel"
        value={nationalNumber}
        onChange={(e) => onNationalNumberChange(e.target.value)}
        placeholder={placeholder ?? "07 07 07 07 07"}
        required={required}
        className="h-full flex-1 rounded-r-lg border-0 bg-transparent px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
      />
      {name && <input type="hidden" name={name} value={fullValue} />}
    </div>
  );
}
