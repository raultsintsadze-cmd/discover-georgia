import "server-only";
import { prisma } from "@/lib/db/client";
import { ModerationStatus, VideoStatus } from "@prisma/client";
import type {
  CreatorService,
  CreatorProfile,
  CreatorApplicationInput,
  CreatorApplicationSummary,
} from "../creator.service";
import { analyticsProvider } from "@/lib/providers/analytics/console";

export class PrismaCreatorService implements CreatorService {
  async getProfile(creatorId: string): Promise<CreatorProfile | null> {
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      include: {
        videos: {
          where: { status: VideoStatus.PUBLISHED },
          select: { placeId: true },
        },
      },
    });
    if (!creator || creator.status !== ModerationStatus.APPROVED) return null;

    const approvedPlaceIds = new Set(creator.videos.map((v) => v.placeId));

    return {
      id: creator.id,
      displayName: creator.displayName,
      photoUrl: creator.photoUrl,
      bio: creator.bio,
      instagram: creator.instagram,
      tiktok: creator.tiktok,
      approvedPlaceCount: approvedPlaceIds.size,
      approvedVideoCount: creator.videos.length,
    };
  }

  async applyAsCreator(userId: string, input: CreatorApplicationInput): Promise<{ creatorId: string }> {
    const existing = await prisma.creator.findUnique({ where: { userId } });
    if (existing) {
      return { creatorId: existing.id };
    }

    const creator = await prisma.creator.create({
      data: {
        userId,
        displayName: input.displayName,
        bio: input.bio,
        instagram: input.instagram,
        tiktok: input.tiktok,
        status: ModerationStatus.PENDING,
      },
    });
    analyticsProvider.track({ name: "creator_submission", submissionType: "creator_application", userId });
    return { creatorId: creator.id };
  }

  async approve(creatorId: string, adminUserId: string): Promise<void> {
    await prisma.creator.update({
      where: { id: creatorId },
      data: { status: ModerationStatus.APPROVED, reviewedByAdminId: adminUserId },
    });
  }

  async reject(creatorId: string, adminUserId: string, reason: string): Promise<void> {
    await prisma.creator.update({
      where: { id: creatorId },
      data: { status: ModerationStatus.REJECTED, reviewedByAdminId: adminUserId, reviewNotes: reason },
    });
  }

  async listPendingApplications(): Promise<CreatorApplicationSummary[]> {
    const creators = await prisma.creator.findMany({
      where: { status: ModerationStatus.PENDING },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return creators.map((c) => ({
      id: c.id,
      displayName: c.displayName,
      bio: c.bio,
      instagram: c.instagram,
      tiktok: c.tiktok,
      applicantEmail: c.user.email,
      createdAt: c.createdAt,
    }));
  }
}

export const creatorService: CreatorService = new PrismaCreatorService();
