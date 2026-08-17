"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Modal = Dialog.Root;
export const ModalTrigger = Dialog.Trigger;

export interface ModalContentProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Centered dialog for desktop-shaped confirmations/forms. On small
 * viewports it still centers rather than going full-bleed — use
 * BottomSheet for mobile-native, thumb-friendly flows instead.
 */
export function ModalContent({ title, description, children, className }: ModalContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-900/40 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-lg bg-surface-1 p-5 shadow-lg",
          "data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-h3 text-ink-900">{title}</Dialog.Title>
            {/* Radix requires a Description for a11y; fall back to a
                screen-reader-only one so unlabeled dialogs don't warn. */}
            <Dialog.Description className={description ? "text-body-sm text-ink-500" : "sr-only"}>
              {description ?? `${title} dialog`}
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <button
              className="flex h-touch w-touch shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-surface-2"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </div>
        <div className="mt-4">{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
