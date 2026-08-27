"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pencil, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TripItinerary } from "./TripItinerary";
import { DriverSelector } from "./DriverSelector";
import { TripRouteAndCost } from "./TripRouteAndCost";
import { RequestTripPanel } from "./RequestTripPanel";
import { TripFormSheet } from "./TripFormSheet";
import { formatDateRange } from "@/lib/utils/format";
import type { TripDTO } from "@/lib/services/trip.service";
import type { PlaceSummary } from "@/lib/services/place.service";
import type { MapPlace } from "@/components/map/PlaceMarkers";

function SectionHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-tint text-caption font-semibold text-accent-600">
        {step}
      </span>
      <p className="text-h3 text-ink-900">{title}</p>
    </div>
  );
}

/**
 * One continuous, sectioned flow (places -> driver -> route/cost -> request)
 * replacing the old itinerary/map/budget tab bar — see docs/architecture.md
 * for why: those three tabs plus a separate /trip/ai chat meant requesting a
 * trip required visiting the Map tab (to trigger route calculation, the only
 * place that did) and then the Budget tab (for driver + submit), neither of
 * which most people found on their own. Sections stay always-visible with
 * soft placeholders (matching RequestTripPanel's existing
 * disabled-until-routeComputed pattern) rather than a hard-gated wizard,
 * since editing an itinerary is iterative, not a one-shot checkout.
 */
export function TripView({ initialTrip }: { initialTrip: TripDTO }) {
  const t = useTranslations("trip");
  const [trip, setTrip] = React.useState(initialTrip);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);
  const [mapPlaces, setMapPlaces] = React.useState<MapPlace[]>([]);
  const [routeComputed, setRouteComputed] = React.useState(false);

  const uniquePlaceIds = React.useMemo(
    () => [...new Set(trip.days.flatMap((d) => d.places.map((p) => p.placeId)))],
    [trip]
  );
  const placeIdsKey = uniquePlaceIds.join(",");

  // The itinerary API deliberately doesn't carry coordinates (see
  // TripDayDTO) — fetch them fresh whenever the trip's place set changes.
  // Runs unconditionally now (previously gated on the Map tab being active)
  // since the route/cost section is always on-screen in the single-flow layout.
  React.useEffect(() => {
    if (uniquePlaceIds.length === 0) {
      setMapPlaces([]);
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
  }, [placeIdsKey]);

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

      <div className="mt-6 flex flex-col gap-8 pb-8">
        <section className="px-5">
          <SectionHeading step={1} title={t("view.stepPlaces")} />
          <TripItinerary trip={trip} onTripChange={setTrip} />
        </section>

        <section className="px-5">
          <SectionHeading step={2} title={t("view.stepDriver")} />
          <DriverSelector
            tripId={trip.id}
            preferredDriverId={trip.preferredDriverId}
            onSelected={(driverId) => setTrip({ ...trip, preferredDriverId: driverId })}
            routeComputed={routeComputed}
          />
        </section>

        <section className="px-5">
          <SectionHeading step={3} title={t("view.stepRoute")} />
          <TripRouteAndCost trip={trip} places={mapPlaces} onRouteComputedChange={setRouteComputed} />
        </section>

        <section className="px-5">
          <SectionHeading step={4} title={t("view.stepRequest")} />
          <RequestTripPanel tripId={trip.id} defaultPassengers={trip.travelers} routeComputed={routeComputed} />
        </section>
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
