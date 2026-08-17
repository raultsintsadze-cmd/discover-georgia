"use client";

import { useTranslations } from "next-intl";
import { APIProvider, Map as GoogleMap, Marker } from "@vis.gl/react-google-maps";
import { PlaceMarkers, type MapPlace } from "./PlaceMarkers";
import type { LatLng } from "@/lib/types/domain";

const GEORGIA_CENTER = { lat: 42.1, lng: 43.5 };
const DEFAULT_ZOOM = 7;

export interface PlaceMapProps {
  places: MapPlace[];
  onSelectPlace: (place: MapPlace) => void;
  userLocation: LatLng | null;
  /** Overrides the default whole-country view — e.g. a single-place mini map. */
  center?: LatLng;
  zoom?: number;
  /** Extra overlays (e.g. route polylines) rendered inside the same map context, so they can use useMap(). */
  children?: React.ReactNode;
}

export function PlaceMap({ places, onSelectPlace, userLocation, center, zoom, children }: PlaceMapProps) {
  const t = useTranslations("map");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-2 px-8 text-center">
        <p className="text-body-sm text-ink-500">
          {t.rich("missingApiKey", {
            code: (chunks) => <code className="rounded bg-surface-1 px-1 py-0.5">{chunks}</code>,
          })}
        </p>
      </div>
    );
  }

  const defaultCenter = center ? { lat: center.latitude, lng: center.longitude } : GEORGIA_CENTER;
  const defaultZoom = zoom ?? DEFAULT_ZOOM;

  return (
    <APIProvider apiKey={apiKey}>
      <GoogleMap
        defaultCenter={defaultCenter}
        defaultZoom={defaultZoom}
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        style={{ width: "100%", height: "100%" }}
      >
        <PlaceMarkers places={places} onSelect={onSelectPlace} />
        {userLocation && (
          <Marker
            position={{ lat: userLocation.latitude, lng: userLocation.longitude }}
            icon={{
              path: "M0,0 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0",
              fillColor: "#C2571B",
              fillOpacity: 1,
              strokeColor: "#FFFFFF",
              strokeWeight: 2,
              scale: 1,
            }}
            zIndex={1000}
          />
        )}
        {children}
      </GoogleMap>
    </APIProvider>
  );
}
