import "server-only";
import { prisma } from "@/lib/db/client";
import { NotificationChannel, type Prisma } from "@prisma/client";
import type { NotificationService, RecordNotificationInput, NotificationDTO } from "../notification.service";

function toDTO(row: { id: string; channel: string; type: string; status: string; createdAt: Date }): NotificationDTO {
  return {
    id: row.id,
    channel: row.channel,
    type: row.type,
    status: row.status as NotificationDTO["status"],
    createdAt: row.createdAt,
  };
}

export class PrismaNotificationService implements NotificationService {
  async record(input: RecordNotificationInput): Promise<{ notificationId: string }> {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        tripRequestId: input.tripRequestId,
        activityInquiryId: input.activityInquiryId,
        channel: input.channel as NotificationChannel,
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue,
      },
    });
    return { notificationId: notification.id };
  }

  async markSent(notificationId: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  async markFailed(notificationId: string, error: string): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "FAILED", error },
    });
  }

  async listForUser(userId: string): Promise<NotificationDTO[]> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return notifications.map(toDTO);
  }
}

export const notificationService: NotificationService = new PrismaNotificationService();
