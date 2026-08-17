"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";

const PEEK_HEIGHT_PX = 104;
const SWIPE_THRESHOLD_PX = 40;

export interface MapSheetProps {
  peek: React.ReactNode;
  children: React.ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

/**
 * Persistent, non-modal bottom sheet for the Map screen (spec §17: "full
 * screen map, draggable bottom sheet"). Deliberately NOT the Radix-Dialog
 * BottomSheet from src/components/ui — that one is a modal (scrim, focus
 * trap, open/close) for on-demand flows. This sheet is always part of the
 * layout, sits over the map without blocking it, and only toggles between
 * a peek and an expanded height.
 */
export function MapSheet({ peek, children, expanded, onExpandedChange }: MapSheetProps) {
  const t = useTranslations("map");
  const dragStartY = React.useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    dragStartY.current = e.clientY;
  }
  function onPointerUp(e: React.PointerEvent) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    if (delta > SWIPE_THRESHOLD_PX) onExpandedChange(false);
    else if (delta < -SWIPE_THRESHOLD_PX) onExpandedChange(true);
    dragStartY.current = null;
  }

  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-10 flex flex-col rounded-t-lg bg-surface-1 shadow-lg",
        "transition-[height] duration-base ease-out"
      )}
      style={{ height: expanded ? "72%" : PEEK_HEIGHT_PX }}
    >
      <button
        type="button"
        className="flex touch-none flex-col items-center pb-1 pt-2.5"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClick={() => onExpandedChange(!expanded)}
        aria-expanded={expanded}
        aria-label={expanded ? t("collapseList") : t("expandList")}
      >
        <span className="h-1.5 w-10 rounded-full bg-surface-2" aria-hidden="true" />
      </button>
      <div className="px-5">{peek}</div>
      <div className={cn("flex-1 overflow-y-auto px-5 pb-4 pt-2", !expanded && "hidden")}>{children}</div>
    </div>
  );
}
