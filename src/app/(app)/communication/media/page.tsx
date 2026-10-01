import Link from "next/link";
import { FileText, Film, ImageIcon, Images } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { getMediaItems } from "@/features/communication/queries/media";
import { cn } from "@/lib/utils";

const HERO = {
  title: "Médias",
  description: "Retrouvez les images, vidéos et documents joints à vos annonces.",
  verseContext: "communication" as const,
};

const TABS = [
  { value: "", label: "Tous" },
  { value: "image", label: "Images" },
  { value: "video", label: "Vidéos" },
  { value: "document", label: "Documents" },
] as const;

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const check = await checkPermission("communication.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <PermissionDenied requiredPermission="communication.view" />
      </div>
    );
  }

  const { type = "" } = await searchParams;
  const loaded = await guardSchema(() => getMediaItems(check.organization.organization.id));
  if (!loaded.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <MigrationNotice migration="2026-10-all-migrations.sql" />
      </div>
    );
  }

  const all = loaded.data;
  const count = (k: string) => all.filter((i) => i.kind === k).length;
  const items = ["image", "video", "document"].includes(type) ? all.filter((i) => i.kind === type) : all;
  const date = new Intl.DateTimeFormat("fr-FR");

  return (
    <div className="flex flex-col gap-6">
      <PageHero {...HERO} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={ImageIcon} iconClassName="bg-blue-100 text-blue-600" label="Images" value={String(count("image"))} />
        <KpiCard icon={Film} iconClassName="bg-purple-100 text-purple-600" label="Vidéos" value={String(count("video"))} />
        <KpiCard icon={FileText} iconClassName="bg-amber-100 text-amber-600" label="Documents" value={String(count("document"))} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Link
                key={t.value}
                href={t.value ? `/communication/media?type=${t.value}` : "/communication/media"}
                className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors", type === t.value ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {items.length === 0 ? (
            <EmptyState icon={Images} title="Aucun média" description="Les images, vidéos et documents ajoutés à vos annonces apparaîtront ici." className="border-0" />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <div key={item.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex aspect-video items-center justify-center bg-slate-100">
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- image du bucket public
                      <img src={item.url} alt={item.name} className="size-full object-cover" />
                    ) : item.kind === "video" ? (
                      <video src={item.url} preload="metadata" className="size-full object-cover" />
                    ) : (
                      <FileText className="size-10 text-slate-400" />
                    )}
                  </a>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-navy" title={item.name}>{item.name}</p>
                    <p className="truncate text-xs text-slate-500">Annonce : {item.announcementTitle}</p>
                    <p className="text-xs text-slate-400">{date.format(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
