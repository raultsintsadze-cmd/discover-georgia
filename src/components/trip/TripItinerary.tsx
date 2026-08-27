"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronUp, ChevronDown, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { AddPlaceToDaySheet } from "./AddPlaceToDaySheet";
import type { TripDTO } from "@/lib/services/trip.service";

function formatDayDate(date: Date | string | null): string | null {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function TripItinerary({ trip, onTripChange }: { trip: TripDTO; onTripChange: (trip: TripDTO) => void }) {
  const t = useTranslations("trip");
  const { toast } = useToast();
  const [busyTripPlaceId, setBusyTripPlaceId] = React.useState<string | null>(null);
  const [addDayNumber, setAddDayNumber] = React.useState<number | null>(null);

  async function callTripApi(input: RequestInfo, init?: RequestInit) {
    const res = await fetch(input, init);
    const body = await res.json();
    if (!res.ok) {
      toast({ title: t("itinerary.updateErrorTitle"), description: body?.error?.message, variant: "danger" });
      return null;
    }
    return body.data as TripDTO;
  }

  async function handleRemove(tripPlaceId: string) {
    setBusyTripPlaceId(tripPlaceId);
    const updated = await callTripApi(`/api/trips/${trip.id}/places/${tripPlaceId}`, { method: "DELETE" });
    if (updated) onTripChange(updated);
    setBusyTripPlaceId(null);
  }

  async function handleMove(dayNumber: number, tripPlaceId: string, direction: -1 | 1) {
    const day = trip.days.find((d) => d.dayNumber === dayNumber);
    if (!day) return;
    const ids = day.places.map((p) => p.tripPlaceId);
    const index = ids.indexOf(tripPlaceId);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    const current = ids[index];
    const target = ids[swapWith];
    if (current === undefined || target === undefined) return;

    const reordered = [...ids];
    reordered[index] = target;
    reordered[swapWith] = current;

    setBusyTripPlaceId(tripPlaceId);
    const updated = await callTripApi(`/api/trips/${trip.id}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayNumber, orderedTripPlaceIds: reordered }),
    });
    if (updated) onTripChange(updated);
    setBusyTripPlaceId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {trip.days.map((day) => (
        <div key={day.id} className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <p className="text-h3 text-ink-900">{t("itinerary.dayLabel", { dayNumber: day.dayNumber })}</p>
            {formatDayDate(day.date) && <p className="text-body-sm text-ink-500">{formatDayDate(day.date)}</p>}
          </div>

          {day.places.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3.5 py-3 text-body-sm text-ink-500">
              {t("itinerary.noPlaces")}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {day.places.map((place, i) => (
                <div
                  key={place.tripPlaceId}
                  className="flex items-center gap-2 rounded-md border border-border bg-surface-1 py-2 pl-3.5 pr-2"
                >
                  <Link href={`/places/${place.placeSlug}`} className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-medium text-ink-900">{place.placeName}</p>
                  </Link>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label={t("itinerary.moveUp")}
                      disabled={i === 0 || busyTripPlaceId === place.tripPlaceId}
                      onClick={() => handleMove(day.dayNumber, place.tripPlaceId, -1)}
                      className="flex h-touch w-9 items-center justify-center text-ink-500 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("itinerary.moveDown")}
                      disabled={i === day.places.length - 1 || busyTripPlaceId === place.tripPlaceId}
                      onClick={() => handleMove(day.dayNumber, place.tripPlaceId, 1)}
                      className="flex h-touch w-9 items-center justify-center text-ink-500 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("itinerary.remove", { name: place.placeName })}
                      disabled={busyTripPlaceId === place.tripPlaceId}
                      onClick={() => handleRemove(place.tripPlaceId)}
                      className="flex h-touch w-9 items-center justify-center text-ink-500 disabled:opacity-30"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" className="self-start" onClick={() => setAddDayNumber(day.dayNumber)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("itinerary.addPlaceButton")}
          </Button>
        </div>
      ))}

      {addDayNumber !== null && (
        <AddPlaceToDaySheet
          open={addDayNumber !== null}
          onOpenChange={(open) => !open && setAddDayNumber(null)}
          tripId={trip.id}
          dayNumber={addDayNumber}
          onAdded={onTripChange}
        />
      )}
    </div>
  );
}
