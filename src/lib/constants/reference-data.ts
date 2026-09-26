/** Données de référence génériques (pays, devises, formats de date) — partagées entre modules
 * (onboarding, paramètres d'organisation...). Volontairement une petite liste ciblée sur les
 * pays actuellement desservis, pas une liste ISO complète. */

export interface CountryOption {
  code: string;
  name: string;
  dial: string;
  flag: string;
  timezone: string;
  currency: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮", timezone: "Africa/Abidjan", currency: "XOF" },
  { code: "SN", name: "Sénégal", dial: "+221", flag: "🇸🇳", timezone: "Africa/Dakar", currency: "XOF" },
  { code: "CM", name: "Cameroun", dial: "+237", flag: "🇨🇲", timezone: "Africa/Douala", currency: "XAF" },
  { code: "BJ", name: "Bénin", dial: "+229", flag: "🇧🇯", timezone: "Africa/Porto-Novo", currency: "XOF" },
  { code: "TG", name: "Togo", dial: "+228", flag: "🇹🇬", timezone: "Africa/Lome", currency: "XOF" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", timezone: "Europe/Paris", currency: "EUR" },
];

export function getCountry(code: string): CountryOption {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0]!;
}

export const DATE_FORMATS = [
  { value: "dd/MM/yyyy", label: "JJ/MM/AAAA" },
  { value: "MM/dd/yyyy", label: "MM/JJ/AAAA" },
  { value: "yyyy-MM-dd", label: "AAAA-MM-JJ" },
] as const;

export const CURRENCIES = [
  { value: "XOF", label: "Franc CFA (XOF)" },
  { value: "XAF", label: "Franc CFA (XAF)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "USD", label: "Dollar (USD)" },
] as const;

export function formatTimezoneOffset(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("fr", { timeZone: timezone, timeZoneName: "shortOffset" });
    const part = formatter.formatToParts(new Date()).find((p) => p.type === "timeZoneName");
    return part?.value ?? "GMT+0";
  } catch {
    return "GMT+0";
  }
}
