/** Owns driver profiles, verification, and availability matching. */
export interface DriverService {
  listAvailable(filters: DriverSearchFilters): Promise<DriverSummary[]>;
  getById(driverId: string): Promise<DriverSummary | null>;
  verify(driverId: string, adminUserId: string): Promise<void>;
  suspend(driverId: string, adminUserId: string, reason: string): Promise<void>;
  setAvailability(driverId: string, status: "AVAILABLE" | "UNAVAILABLE"): Promise<void>;
  /** Every driver regardless of verification/availability status — the admin roster (Phase 11). listAvailable only surfaces the ones customers can actually book. */
  listAll(): Promise<DriverSummary[]>;
}

export interface DriverSearchFilters {
  regionSlug?: string;
  minSeats?: number;
  languages?: string[];
}

export interface DriverSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  rating: number | null;
  vehicle: string | null;
  languages: string[];
  tripsCompleted: number;
  regions: string[];
  pricePerKm: number | null;
  dailyRate: number | null;
  minimumTripPrice: number | null;
  verificationStatus: string;
  availabilityStatus: string;
}
