import type { LineStringGeometry } from "@/lib/types/domain";

/**
 * Decodes Google's encoded polyline algorithm format
 * (https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
 * into a GeoJSON LineString. Standard public algorithm, not vendor code —
 * safe to reimplement directly rather than pull in a dependency for it.
 */
export function decodePolyline(encoded: string): LineStringGeometry {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lng / 1e5, lat / 1e5]); // GeoJSON is [lng, lat]
  }

  return { type: "LineString", coordinates };
}
