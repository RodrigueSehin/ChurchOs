"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

import { IconInput } from "@/components/shared/icon-input";

/** Recherche synchronisée dans l'URL (`?q=`), exécutée côté serveur à chaque changement (avec
 * un debounce) — réutilisable par toute liste paginée côté serveur (familles, visiteurs,
 * groupes...). Voir `features/members/components/members-filters.tsx` pour une variante avec
 * filtre supplémentaire. */
export function SearchBox({ initialValue, placeholder }: { initialValue: string; placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, 400);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <IconInput
      icon={Search}
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={placeholder}
      className="sm:max-w-xs"
    />
  );
}
