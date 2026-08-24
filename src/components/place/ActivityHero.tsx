"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { moodFor, paletteFor } from "@/lib/utils/mood";
import { cn } from "@/lib/utils/cn";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Same cinematic treatment as PlaceHero (mood gradient, drift, floating
 * light shapes) — an activity is content-equivalent to a place now, so its
 * hero shouldn't feel like a lesser/secondary screen. Backs to the parent
 * place instead of /map, since that's the more useful "where did I come
 * from" for an activity page.
 */
export function ActivityHero({
  name,
  category,
  categoryLabel,
  nearPlaceName,
  nearPlaceSlug,
}: {
  name: string;
  category?: string | null;
  categoryLabel: string;
  nearPlaceName: string | null;
  nearPlaceSlug: string | null;
}) {
  const t = useTranslations("common");
  const tActivity = useTranslations("activity");
  const prefersReducedMotion = useReducedMotion();
  const mood = moodFor(category, nearPlaceName);
  const palette = paletteFor(mood);

  return (
    <div
      className="relative h-[46vh] min-h-[300px] w-full overflow-hidden pt-safe"
      style={{
        background: `linear-gradient(135deg, ${palette.glow}, hsl(var(--wine-500)) 45%, hsl(var(--accent-600)))`,
      }}
    >
      {!prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-[-20%] opacity-70"
          style={{ background: `radial-gradient(closest-side, ${palette.glow}, transparent)` }}
          animate={{ x: ["-4%", "4%", "-4%"], y: ["-3%", "3%", "-3%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {!prefersReducedMotion && (
        <>
          <motion.span
            aria-hidden="true"
            className="absolute h-24 w-24 rounded-full blur-2xl"
            style={{ background: palette.accent, opacity: 0.35, top: "18%", left: "12%" }}
            animate={{ y: [0, -14, 0], opacity: [0.25, 0.4, 0.25] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            aria-hidden="true"
            className="absolute h-32 w-32 rounded-full blur-2xl"
            style={{ background: palette.accent, opacity: 0.25, bottom: "22%", right: "8%" }}
            animate={{ y: [0, 16, 0], opacity: [0.2, 0.32, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </>
      )}

      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-t", palette.overlay)} aria-hidden="true" />

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
        <Link
          href={nearPlaceSlug ? `/places/${nearPlaceSlug}` : "/discover"}
          aria-label={t("back")}
          className="absolute left-4 top-4 z-10 flex h-touch w-touch items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm"
          style={{ top: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-6">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.1 }}
          className="text-caption font-medium uppercase tracking-[0.14em]"
          style={{ color: palette.accent }}
        >
          {categoryLabel}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE_OUT, delay: 0.18 }}
          className="font-display text-display text-white [text-wrap:balance]"
        >
          {name}
        </motion.p>
        {nearPlaceName && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.26 }}
          >
            {nearPlaceSlug ? (
              <Link href={`/places/${nearPlaceSlug}`} className="mt-1 inline-block text-body-sm text-white/85 underline">
                {tActivity("hero.atPlace", { place: nearPlaceName })}
              </Link>
            ) : (
              <p className="mt-1 text-body-sm text-white/85">{tActivity("hero.atPlace", { place: nearPlaceName })}</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
