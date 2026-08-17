import type { TripRequestDTO } from "./booking.service";

/**
 * Formats and sends the two trip-request notifications defined in the
 * spec (admin + driver). Wraps TelegramProvider; BookingService calls this
 * after a trip request is created or its status changes.
 */
export interface TelegramService {
  notifyAdminNewTripRequest(request: TripRequestDTO, context: TripRequestNotificationContext): Promise<void>;
  notifyDriverNewTripRequest(request: TripRequestDTO, context: TripRequestNotificationContext): Promise<void>;
}

export interface TripRequestNotificationContext {
  customerName: string;
  routeSummary: string; // e.g. "Tbilisi -> Telavi -> Kazbegi"
  dateRange: string;
  driverName: string | null;
}
