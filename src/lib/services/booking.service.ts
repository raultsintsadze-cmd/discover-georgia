/**
 * Owns trip request creation and lifecycle. Freezes an itinerary snapshot
 * at request time (trips keep changing; requests must not silently drift)
 * and triggers TelegramService notifications.
 */
export interface BookingService {
  createTripRequest(userId: string, input: CreateTripRequestInput): Promise<TripRequestDTO>;
  updateStatus(tripRequestId: string, status: TripRequestStatus, actorUserId: string): Promise<TripRequestDTO>;
  getById(tripRequestId: string): Promise<TripRequestDTO | null>;
  listForUser(userId: string): Promise<TripRequestDTO[]>;
  listForDriver(driverId: string): Promise<TripRequestDTO[]>;
  /** Every trip request across every customer — the admin "view trip requests" action (spec §40). */
  adminList(): Promise<TripRequestDTO[]>;
}

export interface CreateTripRequestInput {
  tripId: string;
  driverId?: string;
  passengers: number;
  notes?: string;
  /** See docs/api.md §1 Idempotency — a retried request with the same key returns the original result. */
  idempotencyKey?: string;
}

export type TripRequestStatus =
  | "PENDING"
  | "DRIVER_ACCEPTED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface TripRequestDTO {
  id: string;
  tripId: string;
  userId: string;
  driverId: string | null;
  distanceMeters: number;
  durationSeconds: number;
  estimatedPriceGel: number;
  passengers: number;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  status: TripRequestStatus;
  createdAt: Date;
}
