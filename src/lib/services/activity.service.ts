/** Owns activities/tours/wine-tastings/adventures data. Never fabricates price/availability. Restaurants are a separate entity — see RestaurantService. */
export interface ActivityService {
  listNearPlace(placeId: string): Promise<ActivityDTO[]>;
  search(filters: ActivitySearchFilters): Promise<ActivityDTO[]>;

  // ── Admin (Phase 11) ────────────────────────────────────────────────────
  adminList(): Promise<ActivityDTO[]>;
  createActivity(input: ActivityAdminInput): Promise<{ activityId: string }>;
  updateActivity(activityId: string, input: Partial<ActivityAdminInput>): Promise<void>;
  deleteActivity(activityId: string): Promise<void>;
}

export interface ActivityAdminInput {
  name: string;
  nearPlaceId: string;
  category: "TOUR" | "WINE_TASTING" | "ADVENTURE" | "CULTURE" | "GENERAL";
  description?: string;
  rating?: number;
  price?: number;
  bookingUrl?: string;
}

export interface ActivitySearchFilters {
  category?: "TOUR" | "WINE_TASTING" | "ADVENTURE" | "CULTURE" | "GENERAL";
  regionSlug?: string;
}

export interface ActivityDTO {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  rating: number | null;
  bookingUrl: string | null;
}
