/**
 * Generic notification dispatch + audit log. TelegramService (and any
 * future EmailService/PushService) writes through this so delivery status
 * is queryable in one place regardless of channel.
 */
export interface NotificationService {
  record(input: RecordNotificationInput): Promise<{ notificationId: string }>;
  markSent(notificationId: string): Promise<void>;
  markFailed(notificationId: string, error: string): Promise<void>;
  listForUser(userId: string): Promise<NotificationDTO[]>;
}

export interface RecordNotificationInput {
  userId?: string;
  tripRequestId?: string;
  activityInquiryId?: string;
  channel: "TELEGRAM" | "EMAIL" | "PUSH";
  type: string;
  payload: Record<string, unknown>;
}

export interface NotificationDTO {
  id: string;
  channel: string;
  type: string;
  status: "PENDING" | "SENT" | "FAILED";
  createdAt: Date;
}
