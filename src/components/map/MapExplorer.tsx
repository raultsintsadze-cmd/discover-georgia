"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { PlaceMap } from "./PlaceMap";
import { MapTopBar } from "./MapTopBar";
import { MapSheet } from "./MapSheet";
import { PlaceListRow } from "./PlaceListRow";
import { PlacePreviewCard } from "./PlacePreviewCard";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { LatLng } from "@/lib/types/domain";
import type { PlaceSummary, PlaceWithDistance } from "@/lib/services/place.service";
import type { MapPlace } from "./PlaceMarkers";

const SEARCH_DEBOUNCE_MS = 300;
const NEARBY_RADIUS_KM = 30;

type ViewMode = "search" | "nearby";

export interface MapExplorerProps {
  categories: { slug: string; name: string }[];
}

function toMapPlaces(places: (PlaceSummary | PlaceWithDistance)[]): MapPlace[] {
  return places.map((p) => ({ id: p.id, slug: p.slug, name: p.name, latitude: p.location.latitude, longitude: p.location.longitude }));
}

export function MapExplorer({ categories }: MapExplorerProps) {
  const t = useTranslations("map");
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>("search");
  const [searchResults, setSearchResults] = React.useState<PlaceSummary[]>([]);
  const [nearbyResults, setNearbyResults] = React.useState<PlaceWithDistance[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [locating, setLocating] = React.useState(false);
  const [userLocation, setUserLocation] = React.useState<LatLng | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = React.useState(false);

  // Debounced search — refetches whenever the query or category filter changes.
  React.useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (activeCategory) params.set("category", activeCategory);
        params.set("pageSize", "100");

        const res = await fetch(`/api/places?${params.toString()}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error?.message ?? "Search failed");

        setSearchResults(body.data as PlaceSummary[]);
        setViewMode("search");
      } catch {
        toast({ title: t("searchErrorToastTitle"), description: t("searchErrorToastDescription"), variant: "danger" });
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  async function handleLocate() {
    if (!("geolocation" in navigator)) {
      toast({ title: t("locationUnavailableToastTitle"), description: t("locationUnavailableToastDescription"), variant: "danger" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const point: LatLng = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserLocation(point);
        try {
          const params = new URLSearchParams({
            lat: String(point.latitude),
            lng: String(point.longitude),
            radiusKm: String(NEARBY_RADIUS_KM),
          });
          const res = await fetch(`/api/places/nearby?${params.toString()}`);
          const body = await res.json();
          if (!res.ok) throw new Error(body?.error?.message ?? "Nearby lookup failed");
          setNearbyResults(body.data as PlaceWithDistance[]);
          setViewMode("nearby");
          setSheetExpanded(true);
          setSelectedId(null);
        } catch {
          toast({ title: t("nearbyErrorToastTitle"), description: t("nearbyErrorToastDescription"), variant: "danger" });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        toast({ title: t("locationDeniedToastTitle"), description: t("locationDeniedToastDescription") });
      },
      { enableHighAccuracy: false, timeout: 10_000 }
    );
  }

  const activeList = viewMode === "nearby" ? nearbyResults : searchResults;
  const selectedPlace = activeList.find((p) => p.id === selectedId) ?? null;
  const mapPlaces = React.useMemo(() => toMapPlaces(activeList), [activeList]);

  function handleSelectFromMap(mapPlace: MapPlace) {
    setSelectedId(mapPlace.id);
    setSheetExpanded(true);
  }

  return (
    <div className="relative h-[calc(100dvh-4.5rem)] w-full overflow-hidden">
      <PlaceMap places={mapPlaces} onSelectPlace={handleSelectFromMap} userLocation={userLocation} />

      <MapTopBar
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          setSelectedId(null);
        }}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={(slug) => {
          setActiveCategory(slug);
          setSelectedId(null);
        }}
        onLocateClick={handleLocate}
        locating={locating}
      />

      <MapSheet
        expanded={sheetExpanded}
        onExpandedChange={setSheetExpanded}
        peek={
          <p className="text-body-sm text-ink-500">
            {loading
              ? t("searching")
              : viewMode === "nearby"
                ? t("nearbyCount", { count: nearbyResults.length })
                : t("searchCount", { count: searchResults.length })}
          </p>
        }
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : selectedPlace ? (
          <PlacePreviewCard place={selectedPlace} onBack={() => setSelectedId(null)} />
        ) : activeList.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-ink-500">{t("noResults")}</p>
        ) : (
          <div>
            {activeList.map((place) => (
              <PlaceListRow key={place.id} place={place} onSelect={() => setSelectedId(place.id)} />
            ))}
          </div>
        )}
      </MapSheet>
    </div>
  );
}
