"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

/**
 * Gradient placeholder standing in for the featured video (Phase 3) or a
 * real photo. No stock/placeholder image asset exists yet, so this uses
 * our own accent-tinted gradient rather than a fabricated external image
 * URL — see spec §48 "use placeholder media where licensed content is not
 * available."
 */
export function PlaceHero({ name, regionName }: { name: string; regionName: string }) {
  const t = useTranslations("place");
  return (
    <div className="relative h-[42vh] min-h-[280px] w-full overflow-hidden bg-gradient-to-br from-wine-500 via-accent-600 to-accent-500 pt-safe">
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/20" aria-hidden="true" />

      <Link
        href="/map"
        aria-label={t("hero.backToMap")}
        className="absolute left-4 top-4 z-10 flex h-touch w-touch items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
        style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </Link>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
        <p className="text-caption font-medium uppercase tracking-wide text-white/80">{regionName}</p>
        <p className="font-display text-h1 text-white">{name}</p>
      </div>
    </div>
  );
}
