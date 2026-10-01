import Link from "next/link";
import { ArrowRight, BookOpen, Download, Library, Star, Tag } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategoryCounts, getLibraryResources, getLibraryStats, getPopularResources } from "@/features/library/queries";
import { LibraryCategoryManager } from "@/features/library/components/library-category-manager";
import { LibraryToolbar } from "@/features/library/components/library-toolbar";
import { ResourceCard } from "@/features/library/components/resource-card";
import { ResourceFormDialog } from "@/features/library/components/resource-form-dialog";
import { RESOURCE_TYPE_TABS } from "@/features/library/schemas";

function n(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

const HERO = {
  title: "Bibliothèque",
  description: "Accédez à une riche collection de ressources pour grandir dans la foi et servir efficacement.",
  verseContext: "library" as const,
};

const CATEGORY_COLORS = ["bg-blue-500", "bg-purple-500", "bg-amber-400", "bg-red-400", "bg-green-500", "bg-violet-400"];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; categoryId?: string; format?: string; sort?: string; saved?: string; page?: string }>;
}) {
  const check = await checkPermission("training.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <PermissionDenied requiredPermission="training.view" />
      </div>
    );
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const type = params.type && params.type in RESOURCE_TYPE_TABS ? params.type : "";
  const sort = ["downloads", "views", "title"].includes(params.sort ?? "") ? (params.sort as string) : "recent";
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("training.manage");

  const [stats, list, categories, popular] = await Promise.all([
    getLibraryStats(organizationId, canManage),
    getLibraryResources({
      organizationId,
      userId: check.user.id,
      canManage,
      search: params.q,
      type,
      categoryId: params.categoryId,
      format: params.format,
      sort,
      bookmarked: params.saved === "1",
      page,
    }),
    getCategoryCounts(organizationId, canManage),
    getPopularResources(organizationId, canManage, 5),
  ]);

  const filtered = Boolean(params.q || type || params.categoryId || params.format || params.saved);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        {...HERO}
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <LibraryCategoryManager categories={categories} />
              <ResourceFormDialog organizationId={organizationId} categories={categories} />
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={BookOpen}
          iconClassName="bg-blue-100 text-blue-600"
          label="Ressources disponibles"
          value={n(stats.total)}
          delta={stats.resourcesDeltaPct ?? undefined}
          periodLabel="vs mois dernier"
        />
        <KpiCard
          icon={Tag}
          iconClassName="bg-green-100 text-green-600"
          label="Catégories"
          value={n(stats.categories)}
          delta={stats.newCategories}
          deltaSuffix=""
          periodLabel="nouvelles ce mois-ci"
        />
        <KpiCard icon={Download} iconClassName="bg-blue-100 text-blue-600" label="Téléchargements" value={n(stats.downloads)} periodLabel="au total" />
        <KpiCard
          icon={Star}
          iconClassName="bg-amber-100 text-amber-600"
          label="Note moyenne"
          value={stats.averageRating === null ? "—" : String(stats.averageRating).replace(".", ",")}
          periodLabel={stats.averageRating === null ? "aucune note pour le moment" : "sur 5"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="flex flex-col gap-5 pt-5">
            <LibraryToolbar
              type={type}
              categoryId={params.categoryId ?? ""}
              format={params.format ?? ""}
              sort={sort}
              bookmarked={params.saved === "1"}
              initialSearch={params.q ?? ""}
              categories={categories}
            />

            <h2 className="text-lg font-bold text-navy">{filtered || sort !== "recent" ? "Ressources" : "Ressources récentes"}</h2>

            {list.rows.length === 0 ? (
              filtered ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={Library} title="Aucune ressource" description="Ajoutez la première ressource de votre bibliothèque." className="border-0" />
              )
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {list.rows.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} canManage={canManage} />
                ))}
              </div>
            )}

            <Pagination
              page={page}
              pageSize={list.pageSize}
              total={list.total}
              hrefForPage={(p) => {
                const sp = new URLSearchParams();
                if (params.q) sp.set("q", params.q);
                if (type) sp.set("type", type);
                if (params.categoryId) sp.set("categoryId", params.categoryId);
                if (params.format) sp.set("format", params.format);
                if (sort !== "recent") sp.set("sort", sort);
                if (params.saved) sp.set("saved", params.saved);
                sp.set("page", String(p));
                return `/library?${sp.toString()}`;
              }}
            />
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Catégories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {categories.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/library?categoryId=${c.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-2.5 text-navy">
                    <span className={`size-5 shrink-0 rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} opacity-80`} />
                    <span className="truncate">{c.name}</span>
                  </span>
                  <span className="font-semibold text-navy">{c.count}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ressources populaires</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {popular.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune ressource pour le moment.</p>
              ) : (
                popular.map((r, i) => (
                  <Link key={r.id} href={`/library?sort=downloads`} className="flex items-center gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-navy">{i + 1}</span>
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-navy to-primary text-white/80">
                      {r.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- couverture du bucket public
                        <img src={r.coverUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <BookOpen className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy">{r.title}</span>
                      {r.author && <span className="block truncate text-xs text-slate-500">{r.author}</span>}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy">
                      <Download className="size-3.5" />
                      {r.downloadCount}
                    </span>
                  </Link>
                ))
              )}
              <Link href="/library?sort=downloads" className="flex items-center gap-1 self-end text-xs text-primary hover:underline">
                Voir tout <ArrowRight className="size-3" />
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
