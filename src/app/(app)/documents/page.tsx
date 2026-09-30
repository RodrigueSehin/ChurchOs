import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { checkPermission } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { PermissionDenied } from "@/components/shared/permission-denied";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFolder, getFolderContents } from "@/features/documents/queries";
import { FolderFormDialog } from "@/features/documents/components/folder-form-dialog";
import { UploadDocumentDialog } from "@/features/documents/components/upload-document-dialog";
import { DocumentsBrowser } from "@/features/documents/components/documents-browser";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ folderId?: string }>;
}) {
  const check = await checkPermission("documents.view");
  if (!check.allowed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Documents" description="Dossiers et fichiers partagés avec gestion des permissions." />
        <PermissionDenied requiredPermission="documents.view" />
      </div>
    );
  }

  const params = await searchParams;
  const organizationId = check.organization.organization.id;
  const canManage = check.context.isAdmin || check.context.permissions.has("documents.manage");

  const currentFolder = params.folderId ? await getFolder(organizationId, params.folderId) : null;
  if (params.folderId && !currentFolder) notFound();

  const contents = await getFolderContents({
    organizationId,
    folderId: params.folderId ?? null,
    userId: check.user.id,
    isAdmin: check.context.isAdmin,
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={currentFolder ? currentFolder.name : "Documents"}
        description={currentFolder ? undefined : "Dossiers et fichiers partagés avec gestion des permissions."}
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <FolderFormDialog parentId={params.folderId ?? null} />
              <UploadDocumentDialog folderId={params.folderId ?? null} organizationId={organizationId} />
            </div>
          ) : undefined
        }
      />

      {currentFolder && (
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link href={currentFolder.parentId ? `/documents?folderId=${currentFolder.parentId}` : "/documents"}>
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </Button>
      )}

      <Card>
        <CardContent className="pt-5">
          <DocumentsBrowser contents={contents} canManage={canManage} isAdmin={check.context.isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}
