/** Owns hotel data. Never fabricates price/availability — returns null when unknown. */
export interface HotelService {
  listNearPlace(placeId: string): Promise<HotelDTO[]>;
  search(filters: HotelSearchFilters): Promise<HotelDTO[]>;

  // ── Admin (Phase 11) ────────────────────────────────────────────────────
  adminList(): Promise<HotelDTO[]>;
  createHotel(input: HotelAdminInput): Promise<{ hotelId: string }>;
  updateHotel(hotelId: string, input: Partial<HotelAdminInput>): Promise<void>;
  deleteHotel(hotelId: string): Promise<void>;
}

export interface HotelAdminInput {
  name: string;
  /** regionId is derived from the linked place — an admin picks a place, not a region directly. */
  nearPlaceId: string;
  description?: string;
  category?: string;
  rating?: number;
  price?: number;
  bookingUrl?: string;
}

export interface HotelSearchFilters {
  regionSlug?: string;
  maxPrice?: number;
  minRating?: number;
}

export interface HotelDTO {
  id: string;
  name: string;
  description: string | null;
  rating: number | null;
  price: number | null; // null => "Price not currently available"
  bookingUrl: string | null;
  category: string | null;
}
