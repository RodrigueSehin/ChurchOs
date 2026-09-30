"use client";

import { useActionState } from "react";
import { Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import { updateProfile, type ProfileActionState } from "@/features/profile/actions";

const initialState: ProfileActionState = {};

const TIMEZONES = [
  "Africa/Abidjan",
  "Africa/Dakar",
  "Africa/Douala",
  "Africa/Porto-Novo",
  "Africa/Lome",
  "Europe/Paris",
];

export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timezone: string;
  currency: string;
}

export function ProfileForm({ values }: { values: ProfileFormValues }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">Prénom *</Label>
          <Input id="firstName" name="firstName" defaultValue={values.firstName} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Nom *</Label>
          <Input id="lastName" name="lastName" defaultValue={values.lastName} required />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={values.email} disabled readOnly />
          <p className="text-xs text-slate-500">L&apos;adresse de connexion ne peut pas être modifiée ici.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Téléphone</Label>
          <IconInput icon={Phone} id="phone" name="phone" type="tel" defaultValue={values.phone} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="timezone">Fuseau horaire</Label>
          <FormSelect id="timezone" name="timezone" defaultValue={values.timezone}>
            {Array.from(new Set([values.timezone, ...TIMEZONES])).map((tz) => (
              <option key={tz} value={tz}>
                {tz.split("/")[1]?.replace("_", " ")}
              </option>
            ))}
          </FormSelect>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency">Devise</Label>
          <FormSelect id="currency" name="currency" defaultValue={values.currency}>
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
      {state.success && <p className="text-sm text-success">Profil enregistré.</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
