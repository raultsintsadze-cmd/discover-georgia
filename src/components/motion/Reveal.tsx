"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export type RevealDirection = "up" | "down" | "left" | "right" | "none";

const OFFSETS: Record<RevealDirection, { x?: number; y?: number }> = {
  up: { y: 28 },
  down: { y: -28 },
  left: { x: 28 },
  right: { x: -28 },
  none: {},
};

type NonMotionConflictingProps = "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration";

export interface RevealProps extends Omit<React.HTMLAttributes<HTMLDivElement>, NonMotionConflictingProps> {
  children: React.ReactNode;
  /** Stagger index — multiplied by 60ms and added to the base delay. */
  index?: number;
  delay?: number;
  direction?: RevealDirection;
  /** Slight scale-in in addition to the slide/fade, for card-like content. */
  scale?: boolean;
  /** Animate once on mount instead of when scrolled into view (hero content above the fold). */
  onMount?: boolean;
  duration?: number;
}

/**
 * Shared entrance-animation wrapper — fade + slide (+ optional scale) that
 * fires either on mount (hero/above-the-fold content) or the first time the
 * element scrolls into view. One primitive so every list/grid in the app
 * animates consistently instead of each screen inventing its own.
 */
export function Reveal({
  children,
  index = 0,
  delay = 0,
  direction = "up",
  scale = false,
  onMount = false,
  duration = 0.6,
  className,
  ...rest
}: RevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const offset = OFFSETS[direction];
  const totalDelay = delay + index * 0.06;

  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...offset,
      ...(scale ? { scale: 0.94 } : {}),
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      ...(scale ? { scale: 1 } : {}),
      transition: { duration, delay: totalDelay, ease: EASE_OUT },
    },
  };

  if (prefersReducedMotion) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      {...(onMount ? { animate: "visible" } : { whileInView: "visible", viewport: { once: true, margin: "-10% 0px" } })}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
