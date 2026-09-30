"use client";

import { useActionState, useState } from "react";
import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { updateOrganization, type OrgActionState } from "@/features/organizations/actions";
import { COUNTRIES } from "@/lib/constants/reference-data";
import type { organizations } from "@/lib/db/schema";

const initialState: OrgActionState = {};

const TIMEZONES = [
  "Africa/Abidjan",
  "Africa/Dakar",
  "Africa/Douala",
  "Africa/Porto-Novo",
  "Africa/Lome",
  "Europe/Paris",
];

export function OrganizationSettingsForm({
  organization,
}: {
  organization: typeof organizations.$inferSelect;
}) {
  const [state, formAction, pending] = useActionState(updateOrganization, initialState);
  const [countryCode, setCountryCode] = useState(organization.countryCode);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nom de l&apos;église *</Label>
          <IconInput icon={Building2} id="name" name="name" defaultValue={organization.name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="legalName">Raison sociale (optionnel)</Label>
          <Input id="legalName" name="legalName" defaultValue={organization.legalName ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Dénomination / Vision (optionnel)</Label>
        <Input id="description" name="description" defaultValue={organization.description ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email officiel</Label>
          <IconInput icon={Mail} id="email" name="email" type="email" defaultValue={organization.email ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <IconInput icon={Phone} id="phone" name="phone" type="tel" defaultValue={organization.phone ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="website">Site web</Label>
          <IconInput icon={Globe} id="website" name="website" type="url" defaultValue={organization.website ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="addressLine1">Adresse</Label>
        <IconInput icon={MapPin} id="addressLine1" name="addressLine1" defaultValue={organization.addressLine1 ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Ville</Label>
          <Input id="city" name="city" defaultValue={organization.city ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="region">Région (optionnel)</Label>
          <Input id="region" name="region" defaultValue={organization.region ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postalCode">Code postal (optionnel)</Label>
          <Input id="postalCode" name="postalCode" defaultValue={organization.postalCode ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="countryCode">Pays</Label>
          <FormSelect
            id="countryCode"
            name="countryCode"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timezone">Fuseau horaire</Label>
          <FormSelect id="timezone" name="timezone" defaultValue={organization.timezone}>
            {Array.from(new Set([organization.timezone, ...TIMEZONES])).map((tz) => (
              <option key={tz} value={tz}>
                {tz.split("/")[1]?.replace("_", " ")}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <FormSelect id="currency" name="currency" defaultValue={organization.currency}>
            {["XOF", "XAF", "EUR", "USD"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </FormSelect>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-success">Informations enregistrées.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
