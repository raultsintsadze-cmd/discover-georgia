import type { LatLng, LineStringGeometry } from "@/lib/types/domain";

/**
 * The single source of truth for distance/duration/geometry. RouteService
 * is the only caller. The AI layer never computes these values itself —
 * it calls the calculate_route tool, which calls RouteService, which calls
 * this provider. See docs/ai-architecture.md.
 *
 * Default implementation: Google Directions API (driving profile) — same
 * project/key as MapProvider, see docs/architecture.md §2.
 */
export interface RoutingProvider {
  calculateRoute(request: RouteRequest): Promise<RouteResult>;
}

export interface RouteRequest {
  origin: LatLng;
  destination: LatLng;
  waypoints?: LatLng[];
  profile?: "driving" | "walking";
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineStringGeometry;
  /** Per-leg breakdown when waypoints are provided (origin -> wp1 -> ... -> destination). */
  legs: RouteLeg[];
  provider: string;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}
