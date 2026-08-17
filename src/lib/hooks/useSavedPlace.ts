"use client";

import * as React from "react";
import { useToast } from "@/components/ui/Toast";

/** Optimistic save/unsave toggle, shared by PlaceActionRow and FeedCard. */
export function useSavedPlace(placeId: string, initialSaved: boolean) {
  const { toast } = useToast();
  const [saved, setSaved] = React.useState(initialSaved);
  const [pending, setPending] = React.useState(false);

  const toggle = React.useCallback(async () => {
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const res = await fetch(next ? "/api/saved" : `/api/saved/${placeId}`, {
        method: next ? "POST" : "DELETE",
        headers: next ? { "Content-Type": "application/json" } : undefined,
        body: next ? JSON.stringify({ placeId }) : undefined,
      });
      if (!res.ok) {
        setSaved(!next);
        toast({ title: "Couldn't update saved places", variant: "danger" });
      }
    } catch {
      setSaved(!next);
      toast({ title: "Couldn't update saved places", variant: "danger" });
    } finally {
      setPending(false);
    }
  }, [saved, placeId, toast]);

  return { saved, pending, toggle };
}
