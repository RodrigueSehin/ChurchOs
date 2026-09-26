import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { campuses } from "@/lib/db/schema";

/**
 * Champs communs au formulaire d'ajout / modification d'un campus.
 *
 * `idPrefix` : cette page a toujours le formulaire "Informations générales" de l'église monté
 * (champs `name`/`email`/`phone`/`addressLine1`/`city`), et peut avoir plusieurs dialogues
 * campus (ajout + une modification par ligne) — des ids en dur entreraient en collision (deux
 * éléments `id="name"` en même temps casse l'association `<label for>` : le navigateur associe
 * le premier trouvé, pas le bon). Chaque instance doit passer un préfixe unique.
 */
export function CampusFormFields({
  campus,
  idPrefix,
}: {
  campus?: typeof campuses.$inferSelect;
  idPrefix: string;
}) {
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("name")}>Nom *</Label>
          <Input id={id("name")} name="name" defaultValue={campus?.name ?? ""} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("code")}>Code (optionnel)</Label>
          <Input id={id("code")} name="code" defaultValue={campus?.code ?? ""} placeholder="Ex : CP-01" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("email")}>Email (optionnel)</Label>
          <Input id={id("email")} name="email" type="email" defaultValue={campus?.email ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("phone")}>Téléphone (optionnel)</Label>
          <Input id={id("phone")} name="phone" type="tel" defaultValue={campus?.phone ?? ""} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("addressLine1")}>Adresse (optionnel)</Label>
          <Input id={id("addressLine1")} name="addressLine1" defaultValue={campus?.addressLine1 ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("city")}>Ville (optionnel)</Label>
          <Input id={id("city")} name="city" defaultValue={campus?.city ?? ""} />
        </div>
      </div>
    </div>
  );
}
