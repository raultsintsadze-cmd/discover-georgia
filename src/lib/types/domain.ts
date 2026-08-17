/**
 * Shared value types used across provider and service contracts.
 * Kept dependency-free (no Prisma, no framework imports) so this module
 * can be imported from anywhere without pulling in the ORM or Next.js.
 */

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Money is always an integer amount in the minor unit (tetri) + currency. */
export interface Money {
  amount: number;
  currency: "GEL" | "USD" | "EUR";
}

export interface DateRange {
  start: Date;
  end: Date;
}

/** GeoJSON LineString — the only geometry shape routes produce. */
export interface LineStringGeometry {
  type: "LineString";
  coordinates: [number, number][]; // [lng, lat] pairs, per GeoJSON spec
}

/**
 * A value that is either a verified FACT (came from a provider/DB), an
 * ESTIMATE (derived via a deterministic formula from facts), or a
 * RECOMMENDATION (an AI judgment call). The AI layer must tag every
 * non-trivial number it surfaces with one of these — see
 * docs/ai-architecture.md §"Fact / Estimate / Recommendation".
 */
export type Confidence = "FACT" | "ESTIMATE" | "RECOMMENDATION";

export interface Labeled<T> {
  value: T;
  confidence: Confidence;
}
