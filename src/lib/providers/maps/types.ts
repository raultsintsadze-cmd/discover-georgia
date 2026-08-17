import type { LatLng } from "@/lib/types/domain";

/**
 * Server-side geocoding abstraction. Client-side map rendering (tiles,
 * markers, clustering) talks to the map vendor's SDK directly inside map
 * components — that rendering surface is intentionally NOT abstracted here,
 * only the data operations that business logic depends on. This keeps the
 * abstraction honest: we abstract what we might swap (Google <-> Mapbox),
 * not the UI widget itself.
 *
 * Default implementation: Google Geocoding API.
 */
export interface MapProvider {
  geocode(query: string): Promise<GeocodeResult[]>;
  reverseGeocode(point: LatLng): Promise<GeocodeResult | null>;
}

export interface GeocodeResult {
  label: string;
  point: LatLng;
  /** Vendor-specific place relevance/confidence, 0-1. Not a domain Confidence. */
  relevance: number;
}
