"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChurchLogo } from "@/components/shared/church-logo";
import { removeOrganizationLogo, uploadOrganizationLogo, type LogoActionState } from "@/features/organizations/actions";
import appLogo from "@/img/logo_churchos.png";

const initialState: LogoActionState = {};
const ACCEPT = "image/png,image/jpeg,image/webp";

/** Téléversement du logo de l'église. Sans logo, l'application affiche celui de ChurchOS
 * (aperçu à droite) ; avec un logo, il remplace celui de ChurchOS dans les menus de l'application. */
export function OrganizationLogoUploader({ organizationName, logoUrl }: { organizationName: string; logoUrl: string | null }) {
  const [state, formAction, uploading] = useActionState(uploadOrganizationLogo, initialState);
  const [, startTransition] = useTransition();
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // L'URL serveur fait foi une fois l'action terminée ; `removed` = suppression confirmée.
  const current = state.logoUrl !== undefined ? state.logoUrl : logoUrl;

  function handleRemove() {
    setRemoving(true);
    setRemoveError(null);
    startTransition(async () => {
      const res = await removeOrganizationLogo();
      setRemoving(false);
      if (res.error) setRemoveError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 sm:w-56">
        {preview || current ? (
          <ChurchLogo url={(preview ?? current)!} name={organizationName} className="bg-transparent" imgClassName="max-h-20" />
        ) : (
          <Image src={appLogo} alt="Logo ChurchOS par défaut" className="h-auto w-36 opacity-60" />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <form action={formAction} onSubmit={() => setPreview(null)} className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            name="logo"
            accept={ACCEPT}
            required
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" />
            Choisir une image
          </Button>
          <Button type="submit" disabled={uploading || !preview}>
            <Upload className="size-4" />
            {uploading ? "Envoi..." : "Enregistrer le logo"}
          </Button>
          {current && (
            <Button type="button" variant="ghost" className="text-danger hover:bg-danger/10" disabled={removing} onClick={handleRemove}>
              <Trash2 className="size-4" />
              {removing ? "Suppression..." : "Supprimer"}
            </Button>
          )}
        </form>
        <p className="text-xs text-slate-500">
          PNG, JPEG ou WebP — 2 Mo maximum. Sans logo, celui de ChurchOS s&apos;affiche dans l&apos;application.
        </p>
        {(state.error || removeError) && (
          <p role="alert" className="text-sm text-danger">
            {state.error ?? removeError}
          </p>
        )}
        {state.success && <p className="text-sm text-success">Logo enregistré.</p>}
      </div>
    </div>
  );
}
