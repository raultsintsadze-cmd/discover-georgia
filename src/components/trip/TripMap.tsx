"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlaceMap } from "@/components/map/PlaceMap";
import { RoutePolylines } from "./RoutePolylines";
import type { MapPlace } from "@/components/map/PlaceMarkers";
import type { RouteSegment } from "@/lib/services/route.service";

const SPREAD_ZOOM = 9;

export function TripMap({ places, segments }: { places: MapPlace[]; segments: RouteSegment[] }) {
  const router = useRouter();
  const t = useTranslations("trip");

  if (places.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-8 text-center">
        <p className="text-body-sm text-ink-500">{t("map.emptyState")}</p>
      </div>
    );
  }

  // No fit-bounds logic yet — a simple centroid + fixed zoom is a fair
  // approximation for a handful of markers within one country.
  const centroid = {
    latitude: places.reduce((sum, p) => sum + p.latitude, 0) / places.length,
    longitude: places.reduce((sum, p) => sum + p.longitude, 0) / places.length,
  };

  return (
    <PlaceMap
      places={places}
      onSelectPlace={(place) => router.push(`/places/${place.slug}`)}
      userLocation={null}
      center={centroid}
      zoom={places.length === 1 ? 12 : SPREAD_ZOOM}
    >
      {segments.length > 0 && <RoutePolylines segments={segments} />}
    </PlaceMap>
  );
}
