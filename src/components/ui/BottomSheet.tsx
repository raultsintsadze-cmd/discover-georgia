"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils/cn";

export const BottomSheet = Dialog.Root;
export const BottomSheetTrigger = Dialog.Trigger;

export interface BottomSheetContentProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

const DISMISS_THRESHOLD_PX = 120;

/**
 * Mobile-native sheet: slides up from the bottom, draggable by its handle,
 * dismisses on a downward drag past the threshold or on overlay tap.
 * Built on Radix Dialog for focus trap / ESC / aria wiring; only the
 * presentation and the drag gesture are custom.
 */
export function BottomSheetContent({ title, description, children, className }: BottomSheetContentProps) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const [dragY, setDragY] = React.useState(0);
  const dragging = React.useRef(false);
  const startY = React.useRef(0);

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragY(Math.max(0, e.clientY - startY.current));
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DISMISS_THRESHOLD_PX) {
      closeRef.current?.click();
    }
    setDragY(0);
  }

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink-900/40 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <Dialog.Content
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-lg bg-surface-1 pb-safe shadow-lg",
          "data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
          className
        )}
      >
        <div
          className="flex touch-none flex-col items-center pb-1 pt-2.5"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-surface-2" aria-hidden="true" />
        </div>
        <div className="px-5 pb-2 pt-1">
          <Dialog.Title className="text-h3 text-ink-900">{title}</Dialog.Title>
          <Dialog.Description className={description ? "text-body-sm text-ink-500" : "sr-only"}>
            {description ?? `${title} sheet`}
          </Dialog.Description>
        </div>
        <div className="overflow-y-auto px-5 pb-6">{children}</div>
        <Dialog.Close ref={closeRef} className="hidden" tabIndex={-1} aria-hidden="true" />
      </Dialog.Content>
    </Dialog.Portal>
  );
}
