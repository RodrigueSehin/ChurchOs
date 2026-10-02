import { CloudUpload, FileText, Film, ImageIcon, Images, Music } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { guardSchema } from "@/lib/db/schema-guard";
import { MigrationNotice } from "@/components/shared/migration-notice";
import { PageHero } from "@/components/shared/page-hero";
import { KpiCard } from "@/components/shared/kpi-card";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { NoResultsState } from "@/components/shared/no-results-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { loadMedia, MEDIA_PAGE_SIZE, summarize } from "@/features/media/queries";
import { MEDIA_STORAGE_QUOTA_BYTES, formatBytes } from "@/features/media/schemas";
import { AddMediaDialog } from "@/features/media/components/add-media-dialog";
import { MediaToolbar } from "@/features/media/components/media-toolbar";
import { MediaWorkspace } from "@/features/media/components/media-workspace";
import { YoutubeDialog } from "@/features/media/components/youtube-dialog";

const HERO = {
  title: "Médias",
  description: "Gérez et organisez les photos, vidéos et autres médias de votre église.",
  verseContext: "communication" as const,
};

const n = (value: number) => new Intl.NumberFormat("fr-FR").format(value);

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string; page?: string }> }) {
  const check = await checkPermission("media.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <PermissionDenied requiredPermission="media.view" />
      </div>
    );
  }

  const params = await searchParams;
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("media.manage");
  const type = ["photo", "video", "audio", "document"].includes(params.type ?? "") ? (params.type as string) : "";
  const page = Math.max(1, Number(params.page) || 1);

  const loaded = await guardSchema(() => loadMedia(organizationId));
  if (!loaded.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHero {...HERO} />
        <MigrationNotice migration="2026-10-10-media-library.sql" />
      </div>
    );
  }

  const { entries, youtube, storageBytes } = loaded.data;
  const stats = summarize(entries, youtube);
  const counts = {
    all: entries.length,
    photo: entries.filter((e) => e.kind === "photo").length,
    video: entries.filter((e) => e.kind === "video").length,
    audio: entries.filter((e) => e.kind === "audio").length,
    document: entries.filter((e) => e.kind === "document").length,
  };
  const term = params.q?.trim().toLowerCase();
  const filtered = entries.filter((e) => (!type || e.kind === type) && (!term || `${e.title} ${e.tags.join(" ")}`.toLowerCase().includes(term)));
  const rows = filtered.slice((page - 1) * MEDIA_PAGE_SIZE, page * MEDIA_PAGE_SIZE);
  const usedPct = Math.min(100, Math.round((storageBytes / MEDIA_STORAGE_QUOTA_BYTES) * 100));

  return (
    <div className="flex flex-col gap-6">
      <PageHero {...HERO} />

      {youtube.state === "no-channel" && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Aucune chaîne YouTube n&apos;est reliée : l&apos;onglet « Vidéos » affiche les vidéos de la chaîne de l&apos;église.{" "}
          {check.context.isAdmin ? "Cliquez sur « Relier YouTube » pour la connecter." : "Demandez à un administrateur de la relier."}
        </div>
      )}
      {youtube.state === "no-key" && (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          L&apos;affichage des vidéos YouTube n&apos;est pas configuré : ajoutez la variable d&apos;environnement <code>YOUTUBE_API_KEY</code>.
        </div>
      )}
      {youtube.state === "error" && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de lire la chaîne YouTube « {youtube.channelTitle} » : {youtube.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard icon={ImageIcon} iconClassName="bg-blue-100 text-blue-600" label="Photos" value={n(stats.photo.count)} delta={stats.photo.growthPct ?? undefined} periodLabel="vs mois dernier" />
        <KpiCard icon={Film} iconClassName="bg-purple-100 text-purple-600" label="Vidéos" value={n(stats.video.count)} delta={stats.video.growthPct ?? undefined} periodLabel="vs mois dernier" />
        <KpiCard icon={Music} iconClassName="bg-orange-100 text-orange-600" label="Audios" value={n(stats.audio.count)} delta={stats.audio.growthPct ?? undefined} periodLabel="vs mois dernier" />
        <KpiCard icon={FileText} iconClassName="bg-green-100 text-green-600" label="Documents" value={n(stats.document.count)} delta={stats.document.growthPct ?? undefined} periodLabel="vs mois dernier" />
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <CloudUpload className="size-9 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Stockage utilisé</p>
                <p className="text-lg font-bold text-navy">
                  {formatBytes(storageBytes)} <span className="text-sm font-normal text-slate-500">/ {formatBytes(MEDIA_STORAGE_QUOTA_BYTES)}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(usedPct, storageBytes > 0 ? 2 : 0)}%` }} />
              </div>
              <span className="text-xs text-slate-500">{usedPct}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <MediaWorkspace
            entries={rows}
            canManage={canManage}
            toolbar={
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <MediaToolbar type={type} initialSearch={params.q ?? ""} counts={counts} />
                </div>
                <div className="flex shrink-0 gap-2">
                  {check.context.isAdmin && (
                    <YoutubeDialog
                      connectedTitle={youtube.state === "ok" || youtube.state === "error" ? youtube.channelTitle : undefined}
                      handle={youtube.state === "ok" ? youtube.channelHandle : null}
                      keyMissing={youtube.state === "no-key"}
                    />
                  )}
                  {canManage && <AddMediaDialog organizationId={organizationId} />}
                </div>
              </div>
            }
            empty={
              term || type ? (
                <NoResultsState className="border-0" />
              ) : (
                <EmptyState icon={Images} title="Aucun média" description="Ajoutez des photos, audios ou documents, et reliez la chaîne YouTube pour afficher vos vidéos." className="border-0" />
              )
            }
            footer={
              <div className="flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Affichage de {filtered.length === 0 ? 0 : (page - 1) * MEDIA_PAGE_SIZE + 1} à {Math.min(page * MEDIA_PAGE_SIZE, filtered.length)} sur {filtered.length} média{filtered.length > 1 ? "s" : ""}
                </p>
                <Pagination
                  page={page}
                  pageSize={MEDIA_PAGE_SIZE}
                  total={filtered.length}
                  hrefForPage={(p) => {
                    const sp = new URLSearchParams();
                    if (params.q) sp.set("q", params.q);
                    if (type) sp.set("type", type);
                    sp.set("page", String(p));
                    return `/communication/media?${sp.toString()}`;
                  }}
                />
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
