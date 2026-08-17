import "server-only";
import { prisma } from "@/lib/db/client";
import type { TelegramService, TripRequestNotificationContext } from "../telegram.service";
import type { TripRequestDTO } from "../booking.service";
import { telegramProvider } from "@/lib/providers/telegram/telegram";
import { notificationService } from "./NotificationService";
import { formatDistanceMeters, formatDuration } from "@/lib/utils/format";

function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

function buildAdminMessage(request: TripRequestDTO, ctx: TripRequestNotificationContext): string {
  return [
    "NEW TRIP REQUEST",
    "",
    `Trip #${shortId(request.id)}`,
    `Customer: ${ctx.customerName}`,
    `Dates: ${ctx.dateRange}`,
    `Passengers: ${request.passengers}`,
    `Route: ${ctx.routeSummary}`,
    `Distance: ${formatDistanceMeters(request.distanceMeters)} (${formatDuration(Math.round(request.durationSeconds / 60))})`,
    `Estimated price: ${request.estimatedPriceGel.toLocaleString()} GEL`,
    `Driver: ${ctx.driverName ?? "Not selected"}`,
  ].join("\n");
}

function buildDriverMessage(request: TripRequestDTO, ctx: TripRequestNotificationContext): string {
  return [
    "NEW TRIP REQUEST",
    "",
    `Trip #${shortId(request.id)}`,
    `Route: ${ctx.routeSummary}`,
    `Dates: ${ctx.dateRange}`,
    `Passengers: ${request.passengers}`,
    `Price: ${request.estimatedPriceGel.toLocaleString()} GEL`,
  ].join("\n");
}

/**
 * Always writes a Notification row — even a missing chatId is a recorded
 * FAILED attempt, not a silent no-op, so the audit trail (docs/database.md
 * Notification) honestly reflects "we tried to notify" for every trip
 * request, not just the ones where delivery was even possible. Delivery
 * failures never throw out of here — a trip request must succeed even
 * when the notification can't be delivered.
 */
async function sendAndRecord(
  chatId: string | null,
  text: string,
  type: string,
  input: { userId?: string; tripRequestId: string }
): Promise<void> {
  const { notificationId } = await notificationService.record({
    userId: input.userId,
    tripRequestId: input.tripRequestId,
    channel: "TELEGRAM",
    type,
    payload: { chatId, text },
  });

  if (!chatId) {
    await notificationService.markFailed(notificationId, "No Telegram chat id configured for this recipient");
    return;
  }

  try {
    await telegramProvider.sendMessage(chatId, text);
    await notificationService.markSent(notificationId);
  } catch (err) {
    await notificationService.markFailed(notificationId, err instanceof Error ? err.message : "Unknown error");
  }
}

export class PrismaTelegramService implements TelegramService {
  async notifyAdminNewTripRequest(request: TripRequestDTO, ctx: TripRequestNotificationContext): Promise<void> {
    await sendAndRecord(process.env.ADMIN_CHAT_ID ?? null, buildAdminMessage(request, ctx), "trip_request.created.admin", {
      tripRequestId: request.id,
    });
  }

  async notifyDriverNewTripRequest(request: TripRequestDTO, ctx: TripRequestNotificationContext): Promise<void> {
    if (!request.driverId) return;

    const driver = await prisma.driver.findUnique({
      where: { id: request.driverId },
      select: { telegramId: true, userId: true },
    });
    await sendAndRecord(driver?.telegramId ?? null, buildDriverMessage(request, ctx), "trip_request.created.driver", {
      userId: driver?.userId ?? undefined,
      tripRequestId: request.id,
    });
  }
}

export const telegramService: TelegramService = new PrismaTelegramService();
