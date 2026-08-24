"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const BURST_ANGLES = [0, 60, 120, 180, 240, 300];

export interface SaveGlyphProps {
  icon: LucideIcon;
  active: boolean;
  className?: string;
}

/**
 * The save/bookmark icon gets its own distinct animation — a spring
 * overshoot pop plus a brief particle burst on save — separate from the
 * plain tap-scale every other rail/action button gets, so the "this place
 * is now yours" moment reads as more than a generic click.
 */
export function SaveGlyph({ icon: Icon, active, className }: SaveGlyphProps) {
  const prevActive = React.useRef(active);
  const [justSaved, setJustSaved] = React.useState(false);

  React.useEffect(() => {
    const wasActive = prevActive.current;
    prevActive.current = active;
    if (!wasActive && active) {
      setJustSaved(true);
      const timeout = setTimeout(() => setJustSaved(false), 550);
      return () => clearTimeout(timeout);
    }
  }, [active]);

  return (
    <span className="relative inline-flex items-center justify-center">
      <motion.span
        animate={active ? { scale: [1, 1.45, 0.9, 1.08, 1] } : { scale: [1, 0.85, 1] }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="inline-flex"
      >
        <Icon className={cn("h-5 w-5", className)} aria-hidden="true" fill={active ? "currentColor" : "none"} />
      </motion.span>
      <AnimatePresence>
        {justSaved && (
          <span className="pointer-events-none absolute inset-0" aria-hidden="true">
            {BURST_ANGLES.map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const dx = Math.cos(rad) * 16;
              const dy = Math.sin(rad) * 16;
              return (
                <motion.span
                  key={angle}
                  initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
                  animate={{ opacity: 0, scale: 1, x: dx, y: dy }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
                />
              );
            })}
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}
