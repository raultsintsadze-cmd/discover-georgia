"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Scoped to (tabs) rather than the app root: a template placed at the app
 * root remounts *everything* below root layout on every navigation,
 * including (tabs)/layout.tsx's persistent BottomNav — which defeats the
 * point of having a shared layout at all. Confirmed live (tagged the
 * rendered <nav> and the active <video> with marker attributes, navigated
 * away and back, both were gone — fresh DOM nodes, not the same instances).
 * Scoping the template to here means BottomNav — rendered by the layout
 * this template sits *below* — now persists across every tab switch, and
 * only each tab's own page content remounts and replays the entrance.
 *
 * Keyed by pathname so switching tabs re-triggers the animation rather than
 * only firing once on first load. Deliberately a one-way entrance (no exit
 * animation) — a true crossfade would need both trees mounted at once,
 * which App Router doesn't do without a routing-level library; a quick
 * fade+rise entrance already reads as "smooth" without that complexity.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) return <>{children}</>;

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
