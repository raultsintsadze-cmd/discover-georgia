"use client";

import * as React from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { RouteSegment } from "@/lib/services/route.service";

/**
 * Imperative google.maps.Polyline management, mirroring the marker
 * pattern in PlaceMarkers.tsx — @vis.gl/react-google-maps has no built-in
 * Polyline component, so this talks to the Maps JS API directly via useMap().
 */
export function RoutePolylines({ segments }: { segments: RouteSegment[] }) {
  const map = useMap();
  const polylinesRef = React.useRef<google.maps.Polyline[]>([]);

  React.useEffect(() => {
    if (!map) return;

    polylinesRef.current = segments.map((segment) => {
      const path = segment.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
      const polyline = new google.maps.Polyline({
        path,
        strokeColor: "#C2571B",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
      polyline.setMap(map);
      return polyline;
    });

    return () => {
      for (const polyline of polylinesRef.current) polyline.setMap(null);
      polylinesRef.current = [];
    };
  }, [map, segments]);

  return null;
}
