import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { checkPermission } from "@/lib/auth/guards";
import { db } from "@/lib/db/client";
import { libraryResources } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { getResourceForViewer } from "@/features/library/queries";
import { LIBRARY_BUCKET, PDF_MIME } from "@/features/library/schemas";

/**
 * Sert le fichier d'une ressource de la bibliothèque depuis NOTRE origine : un PDF s'affiche dans un
 * <iframe> de la page de lecture (une URL Storage directe n'est pas garantie « embarquable »), et le
 * téléchargement (`?download=1`) incrémente le compteur. La réponse est relayée en flux depuis une URL
 * signée courte — pas de mise en mémoire du fichier. Même règles de visibilité que la liste.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const check = await checkPermission("library.view");
  if (!check.allowed) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  const { id } = await params;
  const canManage = check.context.isAdmin || check.context.permissions.has("library.manage");
  const resource = await getResourceForViewer(check.organization.organization.id, id, canManage);
  if (!resource) return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(LIBRARY_BUCKET).createSignedUrl(resource.filePath, 60);
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Fichier indisponible." }, { status: 502 });

  const upstream = await fetch(data.signedUrl);
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "Fichier indisponible." }, { status: 502 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  // Seul le PDF peut s'afficher en ligne ; tout le reste est forcé en téléchargement.
  const inline = !download && resource.fileMime === PDF_MIME;
  if (download) {
    await db
      .update(libraryResources)
      .set({ downloadCount: sql`${libraryResources.downloadCount} + 1` })
      .where(eq(libraryResources.id, resource.id));
  }

  const filename = resource.fileName ?? `${resource.title}.${resource.fileMime === PDF_MIME ? "pdf" : "docx"}`;
  return new Response(upstream.body, {
    headers: {
      "Content-Type": resource.fileMime ?? "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
