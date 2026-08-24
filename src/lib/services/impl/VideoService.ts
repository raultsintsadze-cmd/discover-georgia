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
import { toH264PlaybackUrl } from "@/lib/utils/cloudinaryPlayback";

interface VideoRow {
  id: string;
  placeId: string;
  activityId: string | null;
  url: string;
  detectedCodec: string | null;
  posterUrl: string | null;
  durationSeconds: number | null;
  creator: { displayName: string } | null;
}

function toDTO(video: VideoRow): VideoDTO {
  return {
    id: video.id,
    placeId: video.placeId,
    activityId: video.activityId,
    url: toH264PlaybackUrl(video.url),
    detectedCodec: video.detectedCodec,
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

  async getFeaturedForActivity(activityId: string): Promise<VideoDTO | null> {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: { featuredVideo: { include: { creator: true } } },
    });
    if (!activity?.featuredVideo) return null;
    return toDTO(activity.featuredVideo);
  }

  async listForActivity(activityId: string): Promise<VideoDTO[]> {
    const videos = await prisma.video.findMany({
      where: { activityId, status: VideoStatus.PUBLISHED },
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
        existingActivityId: submission.existingActivityId,
        videoUrl: submission.videoUrl,
        detectedCodec: submission.detectedCodec,
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
      include: { existingActivity: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return submissions.map((s) => ({
      id: s.id,
      placeName: s.placeName,
      existingPlaceId: s.existingPlaceId,
      existingActivityId: s.existingActivityId,
      activityName: s.existingActivity?.name ?? null,
      detectedCodec: s.detectedCodec,
      // Wrapped the same as published videos (see toDTO) — the file
      // already exists in R2 at submission time (upload happens before
      // this row is created), so an admin can actually preview an HEVC
      // submission's playback before approving, not just click a dead link.
      videoUrl: toH264PlaybackUrl(s.videoUrl),
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
    const activity = submission.existingActivityId
      ? await prisma.activity.findUniqueOrThrow({ where: { id: submission.existingActivityId } })
      : null;

    // Attribute to the submitter's own creator profile when they have one;
    // third-party curator submissions (submitting someone else's video,
    // per the ownership-confirmation flow) stay unattributed.
    const creator = await prisma.creator.findUnique({ where: { userId: submission.submittedByUserId } });

    const video = await prisma.video.create({
      data: {
        placeId: place.id,
        activityId: activity?.id,
        creatorId: creator?.id,
        url: submission.videoUrl,
        detectedCodec: submission.detectedCodec,
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
    // explicitly calls setFeatured (spec §10). Same rule for the tagged
    // activity, independently — a place and its activity each get their
    // own "first video becomes featured" moment.
    if (!place.featuredVideoId) {
      await prisma.place.update({ where: { id: place.id }, data: { featuredVideoId: video.id } });
    }
    if (activity && !activity.featuredVideoId) {
      await prisma.activity.update({ where: { id: activity.id }, data: { featuredVideoId: video.id } });
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

  async setFeaturedForActivity(activityId: string, videoId: string): Promise<void> {
    const video = await prisma.video.findUniqueOrThrow({ where: { id: videoId } });
    if (video.activityId !== activityId) {
      throw new Error("Video does not belong to this activity");
    }
    await prisma.activity.update({ where: { id: activityId }, data: { featuredVideoId: videoId } });
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
      include: {
        creator: true,
        place: { select: { id: true, name: true, slug: true, featuredVideoId: true } },
        activity: { select: { id: true, name: true, slug: true, featuredVideoId: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return videos.map((v) => ({
      ...toDTO(v),
      placeName: v.place.name,
      placeSlug: v.place.slug,
      isFeatured: v.place.featuredVideoId === v.id,
      activityName: v.activity?.name ?? null,
      activitySlug: v.activity?.slug ?? null,
      viewCount: v.viewCount,
      completionCount: v.completionCount,
      createdAt: v.createdAt,
    }));
  }
}

export const videoService: VideoService = new PrismaVideoService();
