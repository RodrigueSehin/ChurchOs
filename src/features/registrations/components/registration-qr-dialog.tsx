"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRegistrationQrCode } from "@/features/registrations/actions";

export function RegistrationQrDialog({ registrationId, name }: { registrationId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (dataUrl) return;
    setLoading(true);
    const res = await getRegistrationQrCode(registrationId);
    if (res.error) setError(res.error);
    else setDataUrl(res.dataUrl ?? null);
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="secondary" size="sm" onClick={handleOpen}>
        <QrCode className="size-4" />
        QR
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR d&apos;entrée — {name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3">
          {loading && <p className="text-sm text-slate-400">Génération...</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
          {dataUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="QR code d'entrée" className="size-64 rounded-lg border border-slate-200" />
              <p className="text-center text-xs text-slate-400">
                À présenter à l&apos;entrée pour l&apos;enregistrement de la présence.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
