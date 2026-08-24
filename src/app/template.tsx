"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Next re-mounts template.tsx (not layout.tsx) on every navigation, which
 * is what makes a per-route entrance transition possible here. Keyed by
 * pathname so switching tabs/screens re-triggers the animation rather than
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
