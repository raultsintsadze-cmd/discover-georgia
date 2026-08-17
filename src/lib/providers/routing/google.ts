import "server-only";
import type { RoutingProvider, RouteRequest, RouteResult, RouteLeg } from "./types";
import { decodePolyline } from "./polyline";

const DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

interface DirectionsLeg {
  distance: { value: number };
  duration: { value: number };
}
interface DirectionsResponse {
  status: string;
  error_message?: string;
  routes: { legs: DirectionsLeg[]; overview_polyline: { points: string } }[];
}

export class GoogleRoutingProvider implements RoutingProvider {
  constructor(private readonly apiKey: string) {}

  async calculateRoute(request: RouteRequest): Promise<RouteResult> {
    const params = new URLSearchParams({
      origin: `${request.origin.latitude},${request.origin.longitude}`,
      destination: `${request.destination.latitude},${request.destination.longitude}`,
      mode: request.profile === "walking" ? "walking" : "driving",
      key: this.apiKey,
    });
    if (request.waypoints?.length) {
      params.set("waypoints", request.waypoints.map((w) => `${w.latitude},${w.longitude}`).join("|"));
    }

    const res = await fetch(`${DIRECTIONS_URL}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Google Directions API request failed (HTTP ${res.status})`);
    }

    const data = (await res.json()) as DirectionsResponse;
    if (data.status !== "OK") {
      throw new Error(
        `Google Directions API error: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`
      );
    }

    const route = data.routes[0];
    if (!route) {
      throw new Error("Google Directions API returned no route");
    }

    const legs: RouteLeg[] = route.legs.map((leg) => ({
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
    }));

    return {
      distanceMeters: legs.reduce((sum, l) => sum + l.distanceMeters, 0),
      durationSeconds: legs.reduce((sum, l) => sum + l.durationSeconds, 0),
      geometry: decodePolyline(route.overview_polyline.points),
      legs,
      provider: "google-directions",
    };
  }
}

export const googleRoutingProvider = new GoogleRoutingProvider(
  process.env.ROUTING_PROVIDER_API_KEY ?? process.env.GOOGLE_MAPS_SERVER_API_KEY ?? ""
);
