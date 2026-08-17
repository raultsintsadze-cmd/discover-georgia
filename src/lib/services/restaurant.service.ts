/** Owns restaurant data. Never fabricates price/rating/availability — returns null when unknown. */
export interface RestaurantService {
  listNearPlace(placeId: string): Promise<RestaurantDTO[]>;
  search(filters: RestaurantSearchFilters): Promise<RestaurantDTO[]>;

  // ── Admin (Phase 11) ────────────────────────────────────────────────────
  adminList(): Promise<RestaurantDTO[]>;
  createRestaurant(input: RestaurantAdminInput): Promise<{ restaurantId: string }>;
  updateRestaurant(restaurantId: string, input: Partial<RestaurantAdminInput>): Promise<void>;
  deleteRestaurant(restaurantId: string): Promise<void>;
}

export interface RestaurantAdminInput {
  name: string;
  nearPlaceId: string;
  cuisine?: string;
  description?: string;
  rating?: number;
  priceLevel?: number; // 1-4
  bookingUrl?: string;
}

export interface RestaurantSearchFilters {
  regionSlug?: string;
  cuisine?: string;
  maxPriceLevel?: number; // 1-4
}

export interface RestaurantDTO {
  id: string;
  name: string;
  description: string | null;
  cuisine: string | null;
  rating: number | null;
  priceLevel: number | null; // 1-4, null => "Price not currently available"
  bookingUrl: string | null;
}
