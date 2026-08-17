import * as React from "react";
import { cn } from "@/lib/utils/cn";

// text-body (16px) is required, not cosmetic: below 16px, iOS Safari
// auto-zooms the viewport on focus, which breaks the mobile form UX.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-touch w-full rounded-md border border-border bg-surface-1 px-3.5 text-body text-ink-900",
        "placeholder:text-ink-500",
        "transition-colors duration-fast ease-out",
        "focus-visible:border-accent-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger-500",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[6.5rem] w-full rounded-md border border-border bg-surface-1 px-3.5 py-3 text-body text-ink-900",
        "placeholder:text-ink-500",
        "transition-colors duration-fast ease-out",
        "focus-visible:border-accent-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger-500",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
