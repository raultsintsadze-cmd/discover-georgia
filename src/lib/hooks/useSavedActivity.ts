"use client";

import * as React from "react";
import { useToast } from "@/components/ui/Toast";

/** Optimistic save/unsave toggle for an activity — mirrors useSavedPlace exactly. */
export function useSavedActivity(activityId: string, initialSaved: boolean) {
  const { toast } = useToast();
  const [saved, setSaved] = React.useState(initialSaved);
  const [pending, setPending] = React.useState(false);

  const toggle = React.useCallback(async () => {
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const res = await fetch(next ? "/api/saved-activities" : `/api/saved-activities/${activityId}`, {
        method: next ? "POST" : "DELETE",
        headers: next ? { "Content-Type": "application/json" } : undefined,
        body: next ? JSON.stringify({ activityId }) : undefined,
      });
      if (!res.ok) {
        setSaved(!next);
        toast({ title: "Couldn't update saved activities", variant: "danger" });
      }
    } catch {
      setSaved(!next);
      toast({ title: "Couldn't update saved activities", variant: "danger" });
    } finally {
      setPending(false);
    }
  }, [saved, activityId, toast]);

  return { saved, pending, toggle };
}
