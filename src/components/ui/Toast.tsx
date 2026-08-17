"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ToastVariant = "default" | "success" | "danger";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

type ToastInput = Omit<ToastItem, "id" | "variant"> & { variant?: ToastVariant };

interface ToastContextValue {
  toast: (input: ToastInput) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const variantClasses: Record<ToastVariant, string> = {
  default: "border-border bg-surface-1 text-ink-900",
  success: "border-success-500/20 bg-success-tint text-success-500",
  danger: "border-danger-500/20 bg-danger-tint text-danger-500",
};

/**
 * Toasts anchor to the top of the viewport, not the bottom — the bottom
 * is already owned by the tab bar (spec §4) and is prime thumb-reach real
 * estate; stacking transient messages there would compete with navigation.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const toast = React.useCallback((input: ToastInput) => {
    const id = typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now());
    setToasts((prev) => [...prev, { id, variant: "default", ...input }]);
  }, []);

  function remove(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 rounded-md border p-3.5 shadow-md",
              "data-[state=open]:animate-toast-in data-[swipe=end]:animate-fade-out",
              variantClasses[t.variant]
            )}
            onOpenChange={(open) => !open && remove(t.id)}
          >
            <div className="flex-1">
              <ToastPrimitive.Title className="text-body-sm font-medium">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 text-body-sm opacity-80">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close aria-label="Dismiss" className="shrink-0 rounded-full p-1 hover:bg-black/5">
              <X className="h-4 w-4" aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed left-1/2 top-0 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 p-4 pt-safe outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
