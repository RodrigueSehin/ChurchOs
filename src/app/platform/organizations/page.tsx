import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";
import { StatusFilterForm } from "@/components/shared/status-filter-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ORG_STATUS_LABELS, OrgStatusBadge } from "@/features/platform/components/org-status-badge";
import { PLATFORM_PAGE_SIZE, getPlatformOrganizations } from "@/features/platform/queries";

type SearchParams = Promise<{ q?: string; status?: string; page?: string }>;

const dateFormat = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

export default async function PlatformOrganizationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const { rows, total } = await getPlatformOrganizations({ q, status, page });

  function hrefForPage(target: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    sp.set("page", String(target));
    return `/platform/organizations?${sp.toString()}`;
  }

  return (
    <>
      <PageHeader title="Églises" description={`${total} église${total > 1 ? "s" : ""} sur la plateforme.`} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <SearchBox initialValue={q} placeholder="Rechercher une église (nom, email, ville)..." />
          <StatusFilterForm
            initialStatus={status}
            allLabel="Tous les statuts"
            options={Object.entries(ORG_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          />
        </div>

        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Aucune église ne correspond à cette recherche.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Église</th>
                  <th className="px-3 py-2.5 font-medium">Statut</th>
                  <th className="px-3 py-2.5 font-medium">Plan</th>
                  <th className="px-3 py-2.5 font-medium">Membres</th>
                  <th className="px-3 py-2.5 font-medium">Utilisateurs</th>
                  <th className="px-3 py-2.5 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <Link href={`/platform/organizations/${row.id}`} className="font-medium text-navy hover:underline">
                        {row.name}
                      </Link>
                      <p className="text-xs text-slate-500">{[row.city, row.countryCode].filter(Boolean).join(", ")}</p>
                    </td>
                    <td className="px-3 py-3">
                      <OrgStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-3">
                      {row.planName ? (
                        <span className="flex items-center gap-1.5">
                          {row.planName}
                          {row.subscriptionStatus === "past_due" && <Badge variant="danger">Impayé</Badge>}
                          {row.subscriptionStatus === "trialing" && <Badge variant="warning">Essai</Badge>}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">{row.memberCount}</td>
                    <td className="px-3 py-3">{row.userCount}</td>
                    <td className="px-3 py-3 text-slate-500">{dateFormat.format(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} pageSize={PLATFORM_PAGE_SIZE} total={total} hrefForPage={hrefForPage} />
      </Card>
    </>
  );
}
