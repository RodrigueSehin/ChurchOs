"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Facebook, Instagram, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/shared/form-select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { connectSocialAccount, disconnectSocialAccount, type SocialActionState } from "@/features/social/actions";

const initialState: SocialActionState = {};
const ICONS = { facebook: Facebook, instagram: Instagram } as const;

export function SocialAccountsManager({
  connections,
  canManage,
  cryptoReady,
}: {
  connections: { id: string; provider: string; label: string; externalId: string }[];
  canManage: boolean;
  cryptoReady: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: SocialActionState, formData: FormData) => {
    const result = await connectSocialAccount(prev, formData);
    if (result.success) router.refresh();
    return result;
  }, initialState);

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await disconnectSocialAccount(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {connections.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun compte connecté pour le moment.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {connections.map((c) => {
            const Icon = ICONS[c.provider as keyof typeof ICONS] ?? Facebook;
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <span className="flex min-w-0 items-center gap-3">
                  <Icon className="size-5 shrink-0 text-primary" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-navy">{c.label}</span>
                    <span className="block text-xs text-slate-400">
                      {c.provider === "facebook" ? "Page Facebook" : "Instagram Business"} · ID {c.externalId}
                    </span>
                  </span>
                </span>
                {canManage && (
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="ghost" size="sm" className="text-danger hover:bg-danger/10" aria-label={`Déconnecter ${c.label}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    }
                    title="Déconnecter ce compte ?"
                    description="Les annonces déjà publiées restent en ligne ; il ne sera plus possible de publier sur ce compte."
                    confirmLabel="Déconnecter"
                    variant="destructive"
                    onConfirm={() => remove(c.id)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {canManage && (
        <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-navy">Connecter un compte</p>
          {!cryptoReady && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              La variable d&apos;environnement <code>SOCIAL_TOKEN_KEY</code> n&apos;est pas configurée : générez-en une
              (<code>openssl rand -base64 32</code>), ajoutez-la sur Vercel puis redéployez.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="social-provider">Réseau</Label>
              <FormSelect id="social-provider" name="provider" defaultValue="facebook">
                <option value="facebook">Facebook (Page)</option>
                <option value="instagram">Instagram (compte Business)</option>
              </FormSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="social-id">Identifiant (ID de la Page / du compte)</Label>
              <Input id="social-id" name="externalId" inputMode="numeric" placeholder="Ex : 1234567890" required />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="social-token">Jeton d&apos;accès (longue durée)</Label>
            <Input id="social-token" name="token" type="password" autoComplete="off" placeholder="EAAB..." required />
            <p className="text-xs text-slate-500">
              Jeton de Page avec les permissions <code>pages_manage_posts</code> (Facebook) ou <code>instagram_content_publish</code> (Instagram),
              généré depuis l&apos;application Meta de votre église. Il est vérifié auprès de Meta puis chiffré avant d&apos;être stocké.
            </p>
          </div>
          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending || !cryptoReady}>
              <Plus className="size-4" />
              {pending ? "Vérification..." : "Connecter"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
