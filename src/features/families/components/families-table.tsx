import Link from "next/link";
import { Users } from "lucide-react";

import type { getFamilies } from "@/features/families/queries";

type FamilyRow = Awaited<ReturnType<typeof getFamilies>>["rows"][number];

export function FamiliesTable({ rows }: { rows: FamilyRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <th className="px-4 py-2.5 font-medium">Famille</th>
            <th className="px-3 py-2.5 font-medium">Contact principal</th>
            <th className="px-3 py-2.5 font-medium">Ville</th>
            <th className="px-3 py-2.5 font-medium">Membres</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-4 py-3">
                <Link href={`/families/${row.id}`} className="font-medium text-navy hover:underline">
                  {row.name}
                </Link>
              </td>
              <td className="px-3 py-3 text-slate-500">
                {row.primaryContactFirstName ? `${row.primaryContactFirstName} ${row.primaryContactLastName}` : "—"}
              </td>
              <td className="px-3 py-3 text-slate-500">{row.city ?? "—"}</td>
              <td className="px-3 py-3 text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3.5" />
                  {row.memberCount}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
