import "server-only";
import { prisma } from "@/lib/db/client";
import { VideoStatus, ModerationStatus } from "@prisma/client";
import type {
  VideoService,
  VideoDTO,
  VideoSubmissionInput,
  VideoSubmissionSummary,
  VideoAdminSummary,
} from "../video.service";
import { analyticsProvider } from "@/lib/providers/analytics/console";

interface VideoRow {
  id: string;
  placeId: string;
  url: string;
  posterUrl: string | null;
  durationSeconds: number | null;
  creator: { displayName: string } | null;
}

function toDTO(video: VideoRow): VideoDTO {
  return {
    id: video.id,
    placeId: video.placeId,
    url: video.url,
    posterUrl: video.posterUrl,
    durationSeconds: video.durationSeconds,
    creatorName: video.creator?.displayName ?? null,
  };
}

/**
 * Prisma-backed VideoService. Never auto-publishes: submitVideo only ever
 * creates a PENDING VideoSubmission row; a Video row (the thing the feed
 * actually reads) is created exclusively by approveSubmission, which an
 * admin-authorized caller must invoke — see docs/api.md admin routes.
 */
export class PrismaVideoService implements VideoService {
  async getFeaturedForPlace(placeId: string): Promise<VideoDTO | null> {
    const place = await prisma.place.findUnique({
      where: { id: placeId },
      include: { featuredVideo: { include: { creator: true } } },
    });
    if (!place?.featuredVideo) return null;
    return toDTO(place.featuredVideo);
  }

  async listForPlace(placeId: string): Promise<VideoDTO[]> {
    const videos = await prisma.video.findMany({
      where: { placeId, status: VideoStatus.PUBLISHED },
      include: { creator: true },
      orderBy: { createdAt: "desc" },
    });
    return videos.map(toDTO);
  }

  async submitVideo(submission: VideoSubmissionInput): Promise<{ submissionId: string }> {
    const created = await prisma.videoSubmission.create({
      data: {
        submittedByUserId: submission.submittedByUserId,
        placeName: submission.placeName,
        existingPlaceId: submission.existingPlaceId,
        videoUrl: submission.videoUrl,
        description: submission.description,
        latitude: submission.latitude,
        longitude: submission.longitude,
        categoryId: submission.categoryId,
        regionId: submission.regionId,
        creatorName: submission.creatorName,
        instagram: submission.instagram,
        tiktok: submission.tiktok,
        contactEmail: submission.contactEmail,
        ownershipConfirmed: submission.ownershipConfirmed,
      },
    });
    analyticsProvider.track({
      name: "creator_submission",
      submissionType: "video",
      userId: submission.submittedByUserId,
    });
    return { submissionId: created.id };
  }

  async listPendingSubmissions(): Promise<VideoSubmissionSummary[]> {
    const submissions = await prisma.videoSubmission.findMany({
      where: { status: ModerationStatus.PENDING },
      orderBy: { createdAt: "asc" },
    });
    return submissions.map((s) => ({
      id: s.id,
      placeName: s.placeName,
      existingPlaceId: s.existingPlaceId,
      videoUrl: s.videoUrl,
      description: s.description,
      creatorName: s.creatorName,
      instagram: s.instagram,
      tiktok: s.tiktok,
      contactEmail: s.contactEmail,
      submittedByUserId: s.submittedByUserId,
      createdAt: s.createdAt,
    }));
  }

  async approveSubmission(submissionId: string, adminUserId: string): Promise<{ videoId: string }> {
    const submission = await prisma.videoSubmission.findUniqueOrThrow({ where: { id: submissionId } });
    if (submission.status !== ModerationStatus.PENDING) {
      throw new Error(`Submission ${submissionId} is not pending review`);
    }
    if (!submission.existingPlaceId) {
      // MVP scope: submissions must target an existing place. Suggesting a
      // brand-new place is captured (placeName/lat/lng/category/region are
      // still recorded on the submission) but creating that Place is an
      // admin CRUD action (Phase 11), not something approval does implicitly.
      throw new Error("Submission has no linked place — link an existing place before approving");
    }

    const place = await prisma.place.findUniqueOrThrow({ where: { id: submission.existingPlaceId } });

    // Attribute to the submitter's own creator profile when they have one;
    // third-party curator submissions (submitting someone else's video,
    // per the ownership-confirmation flow) stay unattributed.
    const creator = await prisma.creator.findUnique({ where: { userId: submission.submittedByUserId } });

    const video = await prisma.video.create({
      data: {
        placeId: place.id,
        creatorId: creator?.id,
        url: submission.videoUrl,
        status: VideoStatus.PUBLISHED,
        sourceSubmissionId: submission.id,
      },
    });

    await prisma.videoSubmission.update({
      where: { id: submission.id },
      data: { status: ModerationStatus.APPROVED, reviewedByAdminId: adminUserId },
    });

    // First approved video for a place becomes its featured video
    // automatically; subsequent ones stay "additional" until an admin
    // explicitly calls setFeatured (spec §10).
    if (!place.featuredVideoId) {
      await prisma.place.update({ where: { id: place.id }, data: { featuredVideoId: video.id } });
    }

    return { videoId: video.id };
  }

  async rejectSubmission(submissionId: string, adminUserId: string, reason: string): Promise<void> {
    await prisma.videoSubmission.update({
      where: { id: submissionId },
      data: { status: ModerationStatus.REJECTED, reviewedByAdminId: adminUserId, reviewNotes: reason },
    });
  }

  async setFeatured(placeId: string, videoId: string): Promise<void> {
    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    if (video.placeId !== placeId) {
      throw new Error("Video does not belong to this place");
    }
    await prisma.place.update({ where: { id: placeId }, data: { featuredVideoId: videoId } });
  }

  async recordView(videoId: string): Promise<void> {
    await prisma.video.update({ where: { id: videoId }, data: { viewCount: { increment: 1 } } });
    analyticsProvider.track({ name: "video_view", videoId });
  }

  async recordCompletion(videoId: string): Promise<void> {
    await prisma.video.update({ where: { id: videoId }, data: { completionCount: { increment: 1 } } });
    analyticsProvider.track({ name: "video_completion", videoId });
  }

  async listRecent(limit = 100): Promise<VideoAdminSummary[]> {
    const videos = await prisma.video.findMany({
      where: { status: VideoStatus.PUBLISHED },
      include: { creator: true, place: { select: { id: true, name: true, slug: true, featuredVideoId: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return videos.map((v) => ({
      ...toDTO(v),
      placeName: v.place.name,
      placeSlug: v.place.slug,
      isFeatured: v.place.featuredVideoId === v.id,
      viewCount: v.viewCount,
      completionCount: v.completionCount,
      createdAt: v.createdAt,
    }));
  }
}

export const videoService: VideoService = new PrismaVideoService();
