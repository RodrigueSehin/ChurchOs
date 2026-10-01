"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Youtube } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { removeYoutubeChannel, saveYoutubeChannel } from "@/features/media/actions";

/** Relie (ou déconnecte) la chaîne YouTube de l'église — réservé aux administrateurs. */
export function YoutubeDialog({ connectedTitle, handle, keyMissing }: { connectedTitle?: string; handle?: string | null; keyMissing: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (res.error) setError(res.error);
      else {
        setOpen(false);
        setValue("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Youtube className="size-4 text-red-600" />
        {connectedTitle ? "Chaîne YouTube" : "Relier YouTube"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chaîne YouTube de l&apos;église</DialogTitle>
            <DialogDescription>Les vidéos de l&apos;onglet « Vidéos » sont celles de cette chaîne (mises à jour automatiquement).</DialogDescription>
          </DialogHeader>
          {keyMissing && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              La clé d&apos;API YouTube n&apos;est pas configurée : ajoutez la variable <code>YOUTUBE_API_KEY</code> (clé « YouTube Data API v3 » de Google Cloud) puis redéployez.
            </p>
          )}
          {connectedTitle && (
            <p className="text-sm text-navy">
              Chaîne actuelle : <strong>{connectedTitle}</strong> {handle && <span className="text-slate-500">({handle})</span>}
            </p>
          )}
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="https://www.youtube.com/@nom-de-la-chaine" />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <DialogFooter>
            {connectedTitle && (
              <Button type="button" variant="outline" disabled={pending} onClick={() => run(removeYoutubeChannel)}>
                Déconnecter
              </Button>
            )}
            <Button type="button" disabled={pending || !value.trim()} onClick={() => run(() => saveYoutubeChannel(value))}>
              {pending ? "Vérification…" : connectedTitle ? "Changer de chaîne" : "Relier la chaîne"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
