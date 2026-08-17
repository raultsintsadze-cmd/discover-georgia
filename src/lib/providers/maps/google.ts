import "server-only";
import type { LatLng } from "@/lib/types/domain";
import type { GeocodeResult, MapProvider } from "./types";

const GEOCODE_ENDPOINT = "https://maps.googleapis.com/maps/api/geocode/json";

interface GoogleGeocodeResponse {
  status: string;
  results: {
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }[];
}

export class GoogleMapProvider implements MapProvider {
  constructor(private readonly apiKey: string) {}

  async geocode(query: string): Promise<GeocodeResult[]> {
    const url = new URL(GEOCODE_ENDPOINT);
    url.searchParams.set("address", query);
    url.searchParams.set("key", this.apiKey);
    // Bias results toward Georgia without excluding matches elsewhere.
    url.searchParams.set("region", "ge");

    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = (await res.json()) as GoogleGeocodeResponse;
    if (data.status !== "OK") return [];

    return data.results.map((r, i) => ({
      label: r.formatted_address,
      point: { latitude: r.geometry.location.lat, longitude: r.geometry.location.lng },
      // Google doesn't return a relevance score; approximate by rank order.
      relevance: 1 - i * 0.1,
    }));
  }

  async reverseGeocode(point: LatLng): Promise<GeocodeResult | null> {
    const url = new URL(GEOCODE_ENDPOINT);
    url.searchParams.set("latlng", `${point.latitude},${point.longitude}`);
    url.searchParams.set("key", this.apiKey);

    const res = await fetch(url);
    const data = (await res.json()) as GoogleGeocodeResponse;
    const first = data.results[0];
    if (data.status !== "OK" || !first) return null;

    return { label: first.formatted_address, point, relevance: 1 };
  }
}
