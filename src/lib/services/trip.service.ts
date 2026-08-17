/**
 * Owns trip CRUD and itinerary structure (days/places/ordering). Does NOT
 * compute routes or pricing itself — it composes RouteService and
 * PricingService results into the trip summary.
 */
export interface TripService {
  listTrips(userId: string): Promise<TripDTO[]>;
  createTrip(userId: string, input: CreateTripInput): Promise<TripDTO>;
  getTrip(tripId: string, userId: string): Promise<TripDTO | null>;
  updateTrip(tripId: string, userId: string, input: UpdateTripInput): Promise<TripDTO>;
  deleteTrip(tripId: string, userId: string): Promise<void>;

  addPlace(tripId: string, userId: string, dayNumber: number, placeId: string): Promise<TripDTO>;
  removePlace(tripId: string, userId: string, tripPlaceId: string): Promise<TripDTO>;
  reorderPlaces(tripId: string, userId: string, dayNumber: number, orderedTripPlaceIds: string[]): Promise<TripDTO>;

  getSummary(tripId: string, userId: string): Promise<TripSummary>;

  /** Every trip across every user, most recent first — support/admin visibility (Phase 11), not scoped by owner. */
  adminList(): Promise<TripAdminSummary[]>;
}

export interface TripAdminSummary {
  id: string;
  name: string;
  ownerEmail: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  placeCount: number;
  createdAt: Date;
}

export interface CreateTripInput {
  name: string;
  // Required (not optional, unlike the DB column): days are derived
  // entirely from the date range, so a trip needs one before any place
  // can be added to it. See docs/database.md "Trip day derivation".
  startDate: Date;
  endDate: Date;
  travelers?: number;
  budget?: number;
  startLocation?: string;
  endLocation?: string;
}

export type UpdateTripInput = Partial<CreateTripInput> & {
  preferences?: Record<string, unknown>;
  /** null explicitly clears the selection; undefined leaves it untouched. */
  preferredDriverId?: string | null;
};

export interface TripDTO {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  travelers: number;
  budget: number | null;
  status: string;
  preferredDriverId: string | null;
  /** Free-form (interests, pace, ...) — settable via UpdateTripInput.preferences, but no UI writes it yet. Used by AIService's trip-score preference judgment when present. */
  preferences: Record<string, unknown> | null;
  days: TripDayDTO[];
}

export interface TripDayDTO {
  id: string;
  dayNumber: number;
  date: Date | null;
  places: { tripPlaceId: string; placeId: string; placeName: string; placeSlug: string; orderIndex: number }[];
}

/**
 * Aggregates RouteService + PricingService output — never computed ad hoc
 * in the UI. `routeComputed` is false whenever no Route rows exist yet
 * (never calculated, or invalidated by a later itinerary edit — see
 * TripService.addPlace/removePlace/reorderPlaces); the UI must treat that
 * as "not calculated," not as a real zero. `estimatedTransportCostGel` is
 * always 0 in that state too — the FACT-vs-nothing distinction the AI
 * layer will also have to respect later (see docs/ai-architecture.md).
 */
export interface TripSummary {
  routeComputed: boolean;
  totalDistanceMeters: number;
  totalDrivingSeconds: number;
  estimatedTransportCostGel: number;
}
