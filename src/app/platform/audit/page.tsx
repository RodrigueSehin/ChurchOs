import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { Card } from "@/components/ui/card";
import { PLATFORM_AUDIT_PAGE_SIZE, getPlatformAuditLog } from "@/features/platform/queries";

const ACTION_LABELS: Record<string, string> = {
  "platform.organization.suspended": "Église suspendue",
  "platform.organization.reactivated": "Église réactivée",
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default async function PlatformAuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const { rows, total } = await getPlatformAuditLog(page);

  return (
    <>
      <PageHeader title="Journal" description="Actions effectuées depuis l'administration de la plateforme." />
      <Card>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Aucune action enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Église</th>
                  <th className="px-3 py-2.5 font-medium">Par</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 text-slate-500">{dateFormat.format(r.createdAt)}</td>
                    <td className="px-3 py-3">{ACTION_LABELS[r.action] ?? r.action}</td>
                    <td className="px-3 py-3">
                      {r.organizationId ? (
                        <Link href={`/platform/organizations/${r.organizationId}`} className="text-navy hover:underline">
                          {r.organizationName ?? r.organizationId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{r.actorEmail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={PLATFORM_AUDIT_PAGE_SIZE}
          total={total}
          hrefForPage={(p) => `/platform/audit?page=${p}`}
        />
      </Card>
    </>
  );
}
