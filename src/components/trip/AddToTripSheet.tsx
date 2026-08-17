"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BottomSheet, BottomSheetContent } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { TripFormSheet } from "./TripFormSheet";
import type { TripDTO } from "@/lib/services/trip.service";

export interface AddToTripSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeId: string;
  placeName: string;
}

/**
 * Adds a place to the user's most recent trip (single-implicit-trip model
 * for now — see docs/api.md). Falls back to trip creation inline when the
 * user has none yet.
 */
export function AddToTripSheet({ open, onOpenChange, placeId, placeName }: AddToTripSheetProps) {
  const t = useTranslations("trip");
  const { toast } = useToast();

  function formatDayLabel(dayNumber: number, date: Date | string | null): string {
    if (!date) return t("addToTrip.dayLabel", { dayNumber });
    return t("addToTrip.dayLabelWithDate", {
      dayNumber,
      date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }
  const [loading, setLoading] = React.useState(true);
  const [trip, setTrip] = React.useState<TripDTO | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [addingDay, setAddingDay] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/trips")
      .then((res) => res.json())
      .then((body) => setTrip(body.data?.[0] ?? null))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleAdd(dayNumber: number) {
    if (!trip) return;
    setAddingDay(dayNumber);
    try {
      const res = await fetch(`/api/trips/${trip.id}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, placeId }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: t("addToTrip.addErrorTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: t("addToTrip.addedToast", { tripName: trip.name }), variant: "success" });
      onOpenChange(false);
    } finally {
      setAddingDay(null);
    }
  }

  return (
    <>
      <BottomSheet open={open && !createOpen} onOpenChange={onOpenChange}>
        <BottomSheetContent title={t("addToTrip.sheetTitle")} description={placeName}>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !trip ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-body-sm text-ink-500">{t("addToTrip.noTripYet")}</p>
              <Button onClick={() => setCreateOpen(true)}>{t("addToTrip.createTripButton")}</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-body-sm text-ink-500">{trip.name}</p>
              {trip.days.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => handleAdd(day.dayNumber)}
                  disabled={addingDay !== null}
                  className="flex h-touch items-center justify-between rounded-md border border-border px-3.5 text-left hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="text-body-sm font-medium text-ink-900">{formatDayLabel(day.dayNumber, day.date)}</span>
                  <span className="text-caption text-ink-500">
                    {t("addToTrip.placesCount", { count: day.places.length })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </BottomSheetContent>
      </BottomSheet>

      <TripFormSheet open={createOpen} onOpenChange={setCreateOpen} mode="create" onSaved={setTrip} />
    </>
  );
}
