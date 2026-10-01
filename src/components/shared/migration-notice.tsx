import { DatabaseZap } from "lucide-react";

/** Affiché à la place d'une page dont la base n'a pas encore reçu la migration SQL correspondante. */
export function MigrationNotice({ migration }: { migration: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
      <DatabaseZap className="size-8 text-amber-600" />
      <h2 className="text-lg font-semibold text-navy">Mise à jour de la base de données requise</h2>
      <p className="max-w-lg text-sm text-slate-600">
        Cette page utilise des tables ou colonnes qui n&apos;existent pas encore dans votre base Supabase. Exécutez le fichier{" "}
        <code className="rounded bg-white px-1.5 py-0.5 text-xs">db/migrations/{migration}</code> dans le SQL Editor de Supabase
        (il est idempotent), puis rechargez la page.
      </p>
    </div>
  );
}
