"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Check, ImagePlus, Trash2, Upload } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { removeAvatar, setPresetAvatar, uploadAvatar, type AvatarActionState } from "@/features/profile/actions";
import { AVATAR_PRESETS, isPresetAvatar } from "@/features/profile/avatars";
import { cn } from "@/lib/utils";

const initialState: AvatarActionState = {};
const ACCEPT = "image/png,image/jpeg,image/webp";

/** Choix de l'avatar : liste d'avatars prédéfinis (un clic suffit) ou photo personnelle
 * (aperçu avant envoi). Sans avatar, l'application affiche les initiales. */
export function AvatarPicker({ name, initials, avatarUrl }: { name: string; initials: string; avatarUrl: string | null }) {
  const [state, formAction, uploading] = useActionState(uploadAvatar, initialState);
  const [, startTransition] = useTransition();
  const [pendingPreset, setPendingPreset] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Une action terminée fait foi ; sinon la valeur serveur du rendu.
  const current = state.avatarUrl !== undefined ? state.avatarUrl : avatarUrl;
  const shown = preview ?? pendingPreset ?? current;
  const isCustomPhoto = Boolean(current) && !isPresetAvatar(current);

  function choosePreset(path: string) {
    setPendingPreset(path);
    setLocalError(null);
    startTransition(async () => {
      const res = await setPresetAvatar(path);
      if (res.error) {
        setLocalError(res.error);
        setPendingPreset(null);
      } else {
        window.location.reload();
      }
    });
  }

  function handleRemove() {
    setRemoving(true);
    setLocalError(null);
    startTransition(async () => {
      const res = await removeAvatar();
      if (res.error) {
        setLocalError(res.error);
        setRemoving(false);
      } else {
        window.location.reload();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <Avatar className="size-24 shrink-0 ring-2 ring-slate-100">
        {shown && <AvatarImage src={shown} alt={name} />}
        <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-navy">Choisir un avatar</p>
          <ul className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12" role="list">
            {AVATAR_PRESETS.map((path, i) => {
              const selected = current === path;
              return (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => choosePreset(path)}
                    disabled={pendingPreset !== null}
                    aria-label={`Avatar ${i + 1}`}
                    aria-pressed={selected}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-full ring-2 ring-offset-2 transition disabled:opacity-60",
                      selected ? "ring-primary" : "ring-transparent hover:ring-slate-300",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- petit SVG statique de public/avatars */}
                    <img src={path} alt="" className="size-full object-cover" />
                    {selected && (
                      <span className="absolute inset-0 flex items-center justify-center bg-primary/30">
                        <Check className="size-5 text-white" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <form action={formAction} onSubmit={() => setPreview(null)} className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            name="avatar"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setLocalError(null);
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" />
            Ajouter ma photo
          </Button>
          {preview && (
            <Button type="submit" disabled={uploading}>
              <Upload className="size-4" />
              {uploading ? "Envoi..." : "Enregistrer la photo"}
            </Button>
          )}
          {(current || isCustomPhoto) && (
            <Button type="button" variant="ghost" className="text-danger hover:bg-danger/10" disabled={removing} onClick={handleRemove}>
              <Trash2 className="size-4" />
              {removing ? "Suppression..." : "Retirer l'avatar"}
            </Button>
          )}
        </form>
        <p className="text-xs text-slate-500">Photo : PNG, JPEG ou WebP, 2 Mo maximum.</p>
        {(state.error || localError) && (
          <p role="alert" className="text-sm text-danger">
            {localError ?? state.error}
          </p>
        )}
        {state.success && !preview && <p className="text-sm text-success">Avatar mis à jour.</p>}
      </div>
    </div>
  );
}
