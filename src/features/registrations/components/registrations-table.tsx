import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { REGISTRATION_STATUS_LABELS, paymentLabelFor } from "@/features/registrations/schemas";
import { RegistrationRowActions } from "@/features/registrations/components/registration-row-actions";
import type { getRegistrations } from "@/features/registrations/queries";

type Row = Awaited<ReturnType<typeof getRegistrations>>["rows"][number];

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  pending: "warning",
  confirmed: "success",
  waitlisted: "secondary",
  cancelled: "danger",
  attended: "success",
  no_show: "danger",
};

const PAYMENT_VARIANT: Record<string, "success" | "secondary" | "warning" | "danger"> = {
  Gratuit: "secondary",
  Payé: "success",
  "En attente": "warning",
  Remboursé: "secondary",
  Échoué: "danger",
  Annulé: "danger",
};

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function RegistrationsTable({ rows, canUpdate, canDelete }: { rows: Row[]; canUpdate: boolean; canDelete: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Nom et prénoms</th>
            <th className="px-3 py-2.5 font-medium">Événement</th>
            <th className="px-3 py-2.5 font-medium">Type</th>
            <th className="px-3 py-2.5 font-medium">Date d&apos;inscription</th>
            <th className="px-3 py-2.5 font-medium">Statut</th>
            <th className="px-3 py-2.5 font-medium">Paiement</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const name = row.personId ? `${row.personFirstName} ${row.personLastName}` : (row.guestName ?? "—");
            const payment = paymentLabelFor(row.amount, row.paymentStatus);
            return (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2.5 font-medium text-navy">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">{initialsOf(name)}</AvatarFallback>
                    </Avatar>
                    {name}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-500">{row.eventTitle}</td>
                <td className="px-3 py-3">
                  <Badge variant={row.personId ? "secondary" : "default"}>{row.personId ? "Membre" : "Visiteur"}</Badge>
                </td>
                <td className="px-3 py-3 text-slate-500">{formatDate(row.registeredAt)}</td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[row.status] ?? "secondary"}>{REGISTRATION_STATUS_LABELS[row.status] ?? row.status}</Badge>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={PAYMENT_VARIANT[payment] ?? "secondary"}>{payment}</Badge>
                </td>
                <td className="px-3 py-3">
                  <RegistrationRowActions row={row} name={name} canUpdate={canUpdate} canDelete={canDelete} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
