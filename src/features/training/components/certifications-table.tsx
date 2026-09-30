"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, Download, ExternalLink, Trash2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteCertification, getCertificateDownloadUrl } from "@/features/training/actions";
import { CertificationStatusBadge } from "@/features/training/components/certification-status-badge";
import type { getCertificationsList } from "@/features/training/queries";

type Row = Awaited<ReturnType<typeof getCertificationsList>>["rows"][number];

function formatDate(value: string | null) {
  if (!value) return "-";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

export function CertificationsTable({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function download(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await getCertificateDownloadUrl(id);
      if (res.error || !res.url) setError(res.error ?? "Échec du téléchargement.");
      else window.open(res.url, "_blank", "noopener");
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteCertification(null, id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="overflow-x-auto">
      {error && <p role="alert" className="px-4 pb-2 text-sm text-danger">{error}</p>}
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs font-semibold text-navy">
            <th className="px-3 py-2.5">Certification</th>
            <th className="px-3 py-2.5">Membre</th>
            <th className="px-3 py-2.5">Programme / Cours</th>
            <th className="px-3 py-2.5">Date d&apos;obtention</th>
            <th className="px-3 py-2.5">Statut</th>
            <th className="px-3 py-2.5">Expiration</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Award className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-navy">{row.name}</p>
                    {row.certificateNumber && <p className="text-xs text-slate-400">N° {row.certificateNumber}</p>}
                  </div>
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    {row.photoUrl && <AvatarImage src={row.photoUrl} alt="" />}
                    <AvatarFallback className="text-xs">{`${row.firstName[0] ?? ""}${row.lastName[0] ?? ""}`.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-navy">{row.firstName} {row.lastName}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-slate-600">
                {row.courseId ? (
                  <Link href={`/training/${row.courseId}`} className="hover:underline">{row.courseTitle}</Link>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-3 py-3 text-slate-600">{formatDate(row.issuedAt)}</td>
              <td className="px-3 py-3"><CertificationStatusBadge status={row.status} /></td>
              <td className="px-3 py-3 text-slate-600">{formatDate(row.expiresAt)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-1">
                  {row.hasFile && (
                    <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => download(row.id)} aria-label="Télécharger le certificat">
                      <Download className="size-4" />
                    </Button>
                  )}
                  {row.credentialUrl && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={row.credentialUrl} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le lien du certificat">
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  )}
                  {isAdmin && (
                    <ConfirmDialog
                      trigger={
                        <Button type="button" variant="ghost" size="sm" disabled={pending} className="text-danger hover:bg-danger/10" aria-label="Supprimer">
                          <Trash2 className="size-4" />
                        </Button>
                      }
                      title="Supprimer cette certification ?"
                      description="Cette certification sera définitivement supprimée."
                      confirmLabel="Supprimer"
                      variant="destructive"
                      onConfirm={() => remove(row.id)}
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
