/** Owns activities/tours/wine-tastings/adventures data. Never fabricates price/availability. Restaurants are a separate entity — see RestaurantService. */
export interface ActivityService {
  getBySlug(slug: string): Promise<ActivityDetail | null>;
  listNearPlace(placeId: string): Promise<ActivityDTO[]>;
  search(filters: ActivitySearchFilters): Promise<ActivityDTO[]>;
  submitInquiry(input: ActivityInquiryInput): Promise<{ inquiryId: string }>;

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
  slug: string;
  name: string;
  category: string;
  description: string | null;
  price: number | null;
  rating: number | null;
  bookingUrl: string | null;
  featuredVideoPosterUrl: string | null;
}

/** The activity page's data — ActivityDTO plus the place it's anchored to, for the "at {Place}" link back. */
export interface ActivityDetail extends ActivityDTO {
  nearPlaceId: string | null;
  nearPlaceName: string | null;
  nearPlaceSlug: string | null;
  regionName: string | null;
}

export interface ActivityInquiryInput {
  activityId: string;
  userId?: string;
  contactName: string;
  contactEmail: string;
  message?: string;
}

export interface ActivityInquiryDTO {
  id: string;
  activityId: string;
  contactName: string;
  contactEmail: string;
  message: string | null;
  status: string;
  createdAt: Date;
}
