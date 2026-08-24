"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg" | "icon";

// Every size stays at-or-above the 44px minimum touch target (spec §3);
// "sm" trims padding/type size for denser contexts, not the hit area.
const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-touch px-3 text-body-sm gap-1.5",
  md: "h-touch px-4 text-body gap-2",
  lg: "h-12 px-6 text-body gap-2",
  icon: "h-touch w-touch p-0 shrink-0",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent-500 text-ink-onaccent hover:bg-accent-600 active:bg-accent-600",
  secondary: "bg-surface-2 text-ink-900 hover:bg-surface-2/70",
  outline: "border border-border bg-transparent text-ink-900 hover:bg-surface-2",
  ghost: "bg-transparent text-ink-900 hover:bg-surface-2",
  destructive: "bg-danger-500 text-ink-onaccent hover:bg-danger-500/90",
};

// Omit the handlers whose React DOM signature collides with framer-motion's
// own (drag/animation lifecycle events) — Button renders a motion.button
// for tap feedback, and nothing in this app needs those specific handlers.
type NonMotionConflictingProps = "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration";

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, NonMotionConflictingProps> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading = false, disabled, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={disabled || loading ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium",
          "transition-colors duration-fast ease-out",
          "disabled:pointer-events-none disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
