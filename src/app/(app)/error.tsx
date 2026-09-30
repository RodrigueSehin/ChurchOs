"use client";

import { Button } from "@/components/ui/button";

/** Filet de sécurité : une erreur inattendue dans une page de l'application affiche un message
 * et un bouton de reprise plutôt que la page d'erreur générique du navigateur. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-center">
      <h2 className="text-lg font-semibold text-navy">Une erreur est survenue</h2>
      <p className="max-w-md text-sm text-slate-500">
        {error.message || "Cette page n'a pas pu se charger."}
        {error.digest ? ` (réf. ${error.digest})` : ""}
      </p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
