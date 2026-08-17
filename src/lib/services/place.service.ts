import type { LatLng } from "@/lib/types/domain";
import type { Locale } from "@/i18n/locales";

/**
 * Owns all place read/search logic. The only service allowed to run
 * geospatial queries (PostGIS) against the places table.
 *
 * Every read method takes an optional `locale` (defaults to English,
 * matching pre-i18n behavior for callers that don't pass one). Place
 * name/shortDescription/description have nullable per-locale columns
 * (nameKa/nameRu/etc. — see docs/architecture.md "Internationalization")
 * that are currently unpopulated, so passing a locale is a no-op today;
 * the plumbing exists so a future content-translation pass needs no
 * further interface changes.
 */
export interface PlaceService {
  getBySlug(slug: string, locale?: Locale): Promise<PlaceDetail | null>;
  getById(id: string, locale?: Locale): Promise<PlaceDetail | null>;
  search(filters: PlaceSearchFilters, locale?: Locale): Promise<PlaceSummary[]>;
  getNearby(point: LatLng, radiusKm: number, limit?: number, locale?: Locale): Promise<PlaceWithDistance[]>;
  listByRegion(regionSlug: string, locale?: Locale): Promise<PlaceSummary[]>;
  listByCategory(categorySlug: string, locale?: Locale): Promise<PlaceSummary[]>;
  /** Preserves the order of `ids` (e.g. nearest-first from PlaceDetail.nearbyPlaceIds). */
  getManyByIds(ids: string[], locale?: Locale): Promise<PlaceSummary[]>;
  incrementView(placeId: string): Promise<void>;

  // ── Admin (Phase 11) — every status, not just PUBLISHED ────────────────
  adminList(): Promise<PlaceAdminSummary[]>;
  createPlace(input: PlaceAdminInput): Promise<{ placeId: string }>;
  updatePlace(placeId: string, input: Partial<PlaceAdminInput>): Promise<void>;
  deletePlace(placeId: string): Promise<void>;
}

export interface PlaceAdminInput {
  name: string;
  shortDescription: string;
  description: string;
  regionSlug: string;
  categorySlug: string;
  /** Never guessed — an admin enters the real coordinates by hand. */
  latitude: number;
  longitude: number;
  bestSeason?: string;
  recommendedDuration?: number;
  difficulty?: "EASY" | "MODERATE" | "HARD";
  entranceFee?: string;
  parking?: boolean;
  familyFriendly?: boolean;
  tags?: string[];
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface PlaceAdminSummary extends PlaceSummary {
  status: string;
}

export interface PlaceSearchFilters {
  query?: string;
  regionSlug?: string;
  categorySlug?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  regionName: string;
  categoryName: string;
  featuredVideoPosterUrl: string | null;
  location: LatLng;
}

export interface PlaceWithDistance extends PlaceSummary {
  distanceMeters: number;
}

export interface PlaceDetail extends PlaceSummary {
  description: string;
  bestSeason: string | null;
  recommendedDuration: number | null;
  difficulty: string | null;
  entranceFee: string | null;
  parking: boolean;
  familyFriendly: boolean;
  tags: string[];
  nearbyPlaceIds: string[];
}
