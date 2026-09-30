"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

import { enrollSelf } from "@/features/training/actions";
import { cn } from "@/lib/utils";

/** « S'inscrire » : auto-inscription du membre connecté (refusée côté serveur si le cours ferme ses inscriptions). */
export function EnrollButton({ courseId, className }: { courseId: string; className?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await enrollSelf(courseId);
            if (res.error) setError(res.error);
            else router.refresh();
          })
        }
        className={cn(
          "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60",
          className,
        )}
      >
        <UserPlus className="size-4" />
        {pending ? "Inscription..." : "S'inscrire"}
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
