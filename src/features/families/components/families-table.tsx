import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FamilyRowActions } from "@/features/families/components/family-row-actions";
import type { getFamilies } from "@/features/families/queries";

type FamilyRow = Awaited<ReturnType<typeof getFamilies>>["rows"][number];

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  pastoral: "Suivi",
  to_visit: "À visiter",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  pastoral: "warning",
  to_visit: "danger",
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export function FamiliesTable({ rows, canDelete }: { rows: FamilyRow[]; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="w-10 px-4 py-2.5">
              <Checkbox aria-label="Tout sélectionner" />
            </th>
            <th className="px-3 py-2.5 font-medium">Nom de la famille</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 font-medium">Téléphone</th>
            <th className="px-3 py-2.5 font-medium">Membres</th>
            <th className="px-3 py-2.5 font-medium">Enfants</th>
            <th className="px-3 py-2.5 font-medium">Zone / Quartier</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Dernière visite</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const contact = row.primaryContactFirstName ? `${row.primaryContactFirstName} ${row.primaryContactLastName}` : null;
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <Checkbox aria-label={`Sélectionner ${row.name}`} />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/families/${row.id}`} className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initialsOf(row.name)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-navy hover:underline">{row.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-slate-500">{contact ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{row.primaryContactPhone ?? "—"}</td>
                <td className="px-3 py-3 text-slate-500">{row.memberCount}</td>
                <td className="px-3 py-3 text-slate-500">{row.childrenCount}</td>
                <td className="px-3 py-3 text-slate-500">{row.city ?? "—"}</td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABELS[row.status]}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{formatDate(row.lastVisitAt) ?? "—"}</td>
                <td className="px-3 py-3">
                  <FamilyRowActions familyId={row.id} familyName={row.name} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
