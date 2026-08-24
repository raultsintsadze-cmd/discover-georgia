import type { TripRequestDTO } from "./booking.service";
import type { ActivityInquiryDTO } from "./activity.service";

/**
 * Formats and sends the two trip-request notifications defined in the
 * spec (admin + driver), plus the admin notification for a new activity
 * inquiry. Wraps TelegramProvider; BookingService/ActivityService call
 * this after their respective record is created.
 */
export interface TelegramService {
  notifyAdminNewTripRequest(request: TripRequestDTO, context: TripRequestNotificationContext): Promise<void>;
  notifyDriverNewTripRequest(request: TripRequestDTO, context: TripRequestNotificationContext): Promise<void>;
  notifyAdminActivityInquiry(inquiry: ActivityInquiryDTO, activityName: string): Promise<void>;
}

export interface TripRequestNotificationContext {
  customerName: string;
  routeSummary: string; // e.g. "Tbilisi -> Telavi -> Kazbegi"
  dateRange: string;
  driverName: string | null;
}
