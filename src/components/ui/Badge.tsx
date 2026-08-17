import * as React from "react";
import { cn } from "@/lib/utils/cn";

type BadgeVariant = "neutral" | "accent" | "wine" | "success" | "warning" | "danger";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-2 text-ink-700",
  accent: "bg-accent-tint text-accent-600",
  wine: "bg-wine-tint text-wine-500",
  success: "bg-success-tint text-success-500",
  warning: "bg-warning-tint text-warning-500",
  danger: "bg-danger-tint text-danger-500",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-caption font-medium leading-none",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
