"use client";

import * as React from "react";
import { Marker, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

export interface MapPlace {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface PlaceMarkersProps {
  places: MapPlace[];
  onSelect: (place: MapPlace) => void;
}

/**
 * Classic google.maps.Marker (not AdvancedMarker) — clustering via
 * MarkerClusterer, following the standard vis.gl recipe of collecting
 * marker refs and feeding them to the clusterer. AdvancedMarker would be
 * the nicer-looking option but requires a Map ID configured in Google
 * Cloud Console, which isn't set up yet; swap once one exists.
 */
export function PlaceMarkers({ places, onSelect }: PlaceMarkersProps) {
  const map = useMap();
  const clustererRef = React.useRef<MarkerClusterer | null>(null);
  const markersRef = React.useRef<Map<string, google.maps.Marker>>(new Map());

  React.useEffect(() => {
    if (!map) return;
    clustererRef.current = new MarkerClusterer({ map });
    return () => {
      clustererRef.current?.clearMarkers();
      clustererRef.current = null;
    };
  }, [map]);

  React.useEffect(() => {
    if (!clustererRef.current) return;
    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers([...markersRef.current.values()]);
  }, [places]);

  return (
    <>
      {places.map((place) => (
        <Marker
          key={place.id}
          position={{ lat: place.latitude, lng: place.longitude }}
          title={place.name}
          ref={(marker) => {
            if (marker) markersRef.current.set(place.id, marker);
            else markersRef.current.delete(place.id);
          }}
          onClick={() => onSelect(place)}
        />
      ))}
    </>
  );
}
