"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Mail, MapPin, Phone, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSelect } from "@/components/shared/form-select";
import { IconInput } from "@/components/shared/icon-input";
import type { MemberActionState } from "@/features/members/actions";
import { GENDER_LABELS, MEMBER_STATUS_LABELS } from "@/features/members/schemas";
import type { members, people } from "@/lib/db/schema";

type Action = (prev: MemberActionState, formData: FormData) => Promise<MemberActionState>;

export interface MemberFormValues {
  person?: typeof people.$inferSelect;
  member?: typeof members.$inferSelect;
}

export function MemberForm({
  action,
  campuses,
  initial,
  cancelHref,
}: {
  action: Action;
  campuses: { id: string; name: string }[];
  initial?: MemberFormValues;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const person = initial?.person;
  const member = initial?.member;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">Prénom *</Label>
              <IconInput icon={User} id="firstName" name="firstName" defaultValue={person?.firstName ?? ""} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Nom *</Label>
              <IconInput icon={User} id="lastName" name="lastName" defaultValue={person?.lastName ?? ""} required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="preferredName">Nom préféré (optionnel)</Label>
              <Input id="preferredName" name="preferredName" defaultValue={person?.preferredName ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender">Genre</Label>
              <FormSelect id="gender" name="gender" defaultValue={person?.gender ?? "undisclosed"}>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <IconInput icon={Mail} id="email" name="email" type="email" defaultValue={person?.email ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <IconInput icon={Phone} id="phone" name="phone" type="tel" defaultValue={person?.phone ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input id="birthDate" name="birthDate" type="date" defaultValue={person?.birthDate ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="maritalStatus">Statut marital (optionnel)</Label>
              <Input id="maritalStatus" name="maritalStatus" defaultValue={person?.maritalStatus ?? ""} placeholder="Ex : Marié(e)" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="occupation">Profession (optionnel)</Label>
              <Input id="occupation" name="occupation" defaultValue={person?.occupation ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="campusId">Campus</Label>
              <FormSelect id="campusId" name="campusId" defaultValue={person?.campusId ?? ""}>
                <option value="">—</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormSelect>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressLine1">Adresse</Label>
            <IconInput icon={MapPin} id="addressLine1" name="addressLine1" defaultValue={person?.addressLine1 ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" name="city" defaultValue={person?.city ?? ""} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emergencyContactName">Contact d&apos;urgence (optionnel)</Label>
              <Input id="emergencyContactName" name="emergencyContactName" defaultValue={person?.emergencyContactName ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emergencyContactPhone">Téléphone d&apos;urgence (optionnel)</Label>
              <Input id="emergencyContactPhone" name="emergencyContactPhone" defaultValue={person?.emergencyContactPhone ?? ""} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adhésion</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="status">Statut</Label>
              <FormSelect id="status" name="status" defaultValue={member?.status ?? "active"}>
                {Object.entries(MEMBER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="membershipDate">Date d&apos;adhésion</Label>
              <Input id="membershipDate" name="membershipDate" type="date" defaultValue={member?.membershipDate ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="baptismDate">Date de baptême (optionnel)</Label>
              <Input id="baptismDate" name="baptismDate" type="date" defaultValue={member?.baptismDate ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="salvationDate">Date de conversion (optionnel)</Label>
              <Input id="salvationDate" name="salvationDate" type="date" defaultValue={member?.salvationDate ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="previousChurch">Église précédente (optionnel)</Label>
              <Input id="previousChurch" name="previousChurch" defaultValue={member?.previousChurch ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="department">Département (optionnel)</Label>
              <Input id="department" name="department" defaultValue={member?.department ?? ""} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <textarea
              id="notes"
              name="notes"
              defaultValue={person?.notes ?? ""}
              rows={3}
              className="flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </div>
        </CardContent>
      </Card>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" asChild>
          <Link href={cancelHref}>Annuler</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}
