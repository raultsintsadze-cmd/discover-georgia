"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TripItinerary } from "./TripItinerary";
import { TripRouteSection } from "./TripRouteSection";
import { TripBudget } from "./TripBudget";
import { TripFormSheet } from "./TripFormSheet";
import { formatDateRange } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { TripDTO } from "@/lib/services/trip.service";
import type { PlaceSummary } from "@/lib/services/place.service";
import type { MapPlace } from "@/components/map/PlaceMarkers";

type Tab = "itinerary" | "map" | "budget";
const TAB_KEYS: { key: Tab; labelKey: string }[] = [
  { key: "itinerary", labelKey: "view.tabItinerary" },
  { key: "map", labelKey: "view.tabMap" },
  { key: "budget", labelKey: "view.tabBudget" },
];

export function TripView({ initialTrip }: { initialTrip: TripDTO }) {
  const t = useTranslations("trip");
  const [trip, setTrip] = React.useState(initialTrip);
  const [tab, setTab] = React.useState<Tab>("itinerary");
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const [mapPlaces, setMapPlaces] = React.useState<MapPlace[]>([]);

  const uniquePlaceIds = React.useMemo(
    () => [...new Set(trip.days.flatMap((d) => d.places.map((p) => p.placeId)))],
    [trip]
  );
  const placeIdsKey = uniquePlaceIds.join(",");

  // The itinerary API deliberately doesn't carry coordinates (see
  // TripDayDTO) — fetch them fresh whenever the trip's place set changes,
  // so the map tab stays correct after add/remove without threading
  // location data through every mutation callback.
  React.useEffect(() => {
    if (tab !== "map" || uniquePlaceIds.length === 0) {
      if (uniquePlaceIds.length === 0) setMapPlaces([]);
      return;
    }
    fetch(`/api/places/by-ids?ids=${uniquePlaceIds.join(",")}`)
      .then((res) => res.json())
      .then((body) =>
        setMapPlaces(
          (body.data as PlaceSummary[]).map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            latitude: p.location.latitude,
            longitude: p.location.longitude,
          }))
        )
      )
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, placeIdsKey]);

  if (deleted) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <p className="text-body text-ink-500">{t("view.deletedMessage")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col pt-safe">
      <div className="flex items-start justify-between px-5 pt-5">
        <div>
          <p className="text-h1 text-ink-900">{trip.name}</p>
          <p className="mt-1 text-body-sm text-ink-500">{formatDateRange(trip.startDate, trip.endDate)}</p>
          <p className="mt-0.5 flex items-center gap-1 text-body-sm text-ink-500">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {t("view.travelerCount", { count: trip.travelers })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label={t("view.editAriaLabel")}
          className="flex h-touch w-touch items-center justify-center rounded-full text-ink-500 hover:bg-surface-2"
        >
          <Pencil className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="px-5 pt-3">
        <Link href="/trip/ai">
          <Button className="w-full">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t("view.askAiButton")}
          </Button>
        </Link>
      </div>

      <div role="tablist" aria-label={t("view.tabListAriaLabel")} className="mt-4 flex gap-1 border-b border-border px-5">
        {TAB_KEYS.map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            role="tab"
            aria-selected={tab === tabDef.key}
            onClick={() => setTab(tabDef.key)}
            className={cn(
              "border-b-2 px-3 py-2.5 text-body-sm font-medium",
              tab === tabDef.key ? "border-accent-500 text-accent-600" : "border-transparent text-ink-500"
            )}
          >
            {t(tabDef.labelKey)}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1">
        {tab === "itinerary" && <TripItinerary trip={trip} onTripChange={setTrip} />}
        {tab === "map" && <TripRouteSection tripId={trip.id} places={mapPlaces} />}
        {tab === "budget" && <TripBudget trip={trip} onTripChange={setTrip} />}
      </div>

      <TripFormSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        trip={trip}
        onSaved={setTrip}
        onDeleted={() => setDeleted(true)}
      />
    </div>
  );
}
