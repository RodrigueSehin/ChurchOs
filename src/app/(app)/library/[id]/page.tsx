import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { eq, sql } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { libraryResources } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { docxToHtml } from "@/features/library/docx";
import { getResourceForViewer } from "@/features/library/queries";
import { DOCX_MIME, LIBRARY_BUCKET, PDF_MIME, RESOURCE_TYPE_LABELS, formatKind, formatSize } from "@/features/library/schemas";

/** Au-delà, la conversion DOCX → HTML serait trop lourde pour une requête : on propose le téléchargement. */
const DOCX_PREVIEW_MAX_BYTES = 20 * 1024 * 1024;

type DocxResult = { html: string } | { message: string };

/** Télécharge le DOCX depuis Storage (avec la session de l'utilisateur : la policy RLS du bucket
 * s'applique) et le convertit en HTML sûr ; toute erreur devient un message affichable. */
async function loadDocx(filePath: string, fileSize: number | null): Promise<DocxResult> {
  if ((fileSize ?? 0) > DOCX_PREVIEW_MAX_BYTES) {
    return { message: "Ce document est trop volumineux pour être affiché ici : téléchargez-le pour le lire." };
  }
  const supabase = await createClient();
  const { data: blob, error } = await supabase.storage.from(LIBRARY_BUCKET).download(filePath);
  if (error || !blob) return { message: "Le fichier est indisponible pour le moment." };
  try {
    const { html } = await docxToHtml(Buffer.from(await blob.arrayBuffer()));
    return html.trim()
      ? { html }
      : { message: "Ce document ne contient pas de texte affichable : téléchargez-le pour le consulter." };
  } catch {
    return { message: "Le contenu de ce document n'a pas pu être lu : téléchargez-le pour le consulter." };
  }
}

export default async function LibraryResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("training.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Bibliothèque" />
        <PermissionDenied requiredPermission="training.view" />
      </div>
    );
  }

  const { id } = await params;
  const canManage = check.context.isAdmin || check.context.permissions.has("training.manage");
  const resource = await getResourceForViewer(check.organization.organization.id, id, canManage);
  if (!resource) notFound();

  await db
    .update(libraryResources)
    .set({ viewCount: sql`${libraryResources.viewCount} + 1` })
    .where(eq(libraryResources.id, resource.id));

  const fileUrl = `/api/library/${resource.id}/file`;
  let content: React.ReactNode;

  if (resource.fileMime === PDF_MIME) {
    content = (
      <iframe src={fileUrl} title={resource.title} className="h-[80vh] w-full rounded-lg border border-slate-200 bg-slate-50" />
    );
  } else if (resource.fileMime === DOCX_MIME) {
    const docx = await loadDocx(resource.filePath, resource.fileSize);
    content =
      "html" in docx ? (
        <article
          className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 text-[15px] leading-7 text-slate-800 sm:p-10 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-3 [&_img]:max-w-full [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: docx.html }}
        />
      ) : (
        <Notice>{docx.message}</Notice>
      );
  } else {
    content = <Notice>Ce format ne peut pas être affiché ici : téléchargez le fichier.</Notice>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={resource.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {resource.categoryName && <Badge variant="secondary">{resource.categoryName}</Badge>}
            <span>{RESOURCE_TYPE_LABELS[resource.resourceType] ?? resource.resourceType}</span>
            <span>·</span>
            <span>
              {formatKind(resource.fileMime)}
              {resource.fileSize ? ` · ${formatSize(resource.fileSize)}` : ""}
            </span>
            {resource.author && (
              <>
                <span>·</span>
                <span>{resource.author}</span>
              </>
            )}
          </span>
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href="/library">
                <ArrowLeft className="size-4" />
                Bibliothèque
              </Link>
            </Button>
            <Button asChild size="sm">
              <a href={`${fileUrl}?download=1`}>
                <Download className="size-4" />
                Télécharger
              </a>
            </Button>
          </>
        }
      />

      {resource.description && <p className="max-w-3xl text-sm text-slate-600">{resource.description}</p>}
      {content}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-5 text-sm text-slate-600">
        <FileText className="size-5 shrink-0 text-slate-400" />
        {children}
      </CardContent>
    </Card>
  );
}
