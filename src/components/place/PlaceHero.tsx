"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { moodFor, paletteFor } from "@/lib/utils/mood";
import { cn } from "@/lib/utils/cn";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Gradient placeholder standing in for the featured video (Phase 3) or a
 * real photo. No stock/placeholder image asset exists yet, so this uses
 * our own accent-tinted gradient rather than a fabricated external image
 * URL — see spec §48 "use placeholder media where licensed content is not
 * available." Mood-tinted (see lib/utils/mood) so mountains/wine/coast
 * places each get their own cinematic color story instead of one flat
 * brand gradient, with a slow continuous drift and a couple of soft
 * floating light shapes for a bit of life without being distracting.
 */
export function PlaceHero({ name, regionName, categoryName }: { name: string; regionName: string; categoryName?: string }) {
  const t = useTranslations("place");
  const prefersReducedMotion = useReducedMotion();
  const mood = moodFor(categoryName, regionName);
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
          style={{
            background: `radial-gradient(closest-side, ${palette.glow}, transparent)`,
          }}
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
          href="/map"
          aria-label={t("hero.backToMap")}
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
          {regionName}
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE_OUT, delay: 0.18 }}
          className="font-display text-display text-white [text-wrap:balance]"
        >
          {name}
        </motion.p>
      </div>
    </div>
  );
}
