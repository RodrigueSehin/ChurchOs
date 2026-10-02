"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Direction = "up" | "left" | "right" | "scale";

/**
 * Fait apparaître son contenu (fondu + déplacement) quand il entre dans l'écran. `delay` (ms) décale
 * l'apparition pour enchaîner des éléments voisins. Sans `IntersectionObserver`, le contenu est affiché
 * directement ; `prefers-reduced-motion` neutralise l'effet (voir globals.css).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-dir={direction === "up" ? undefined : direction} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties} className={cn("reveal", className)}>
      {children}
    </div>
  );
}
