import type { LineStringGeometry } from "@/lib/types/domain";

/**
 * The single place trip distances/durations/geometry are computed. Wraps
 * RoutingProvider and persists results as Route rows. Nothing else in the
 * codebase — including AIService — is allowed to compute these numbers.
 */
export interface RouteService {
  /** Routes every consecutive place-to-place leg across all days of a trip, persisting the result. */
  calculateTripRoute(tripId: string): Promise<TripRouteResult>;
  /** Reads persisted Route rows without recomputing — empty result if calculateTripRoute hasn't run since the last edit. */
  getTripRoute(tripId: string): Promise<TripRouteResult>;
  getSegment(originPlaceId: string, destinationPlaceId: string): Promise<RouteSegment>;
}

export interface RouteSegment {
  originPlaceId: string;
  destinationPlaceId: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: LineStringGeometry;
}

export interface TripRouteResult {
  segments: RouteSegment[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}
