/**
 * Owns the video moderation workflow (UPLOAD -> PENDING -> ADMIN REVIEW ->
 * APPROVED -> PUBLISHED) and featured-video selection. Never auto-publishes.
 */
export interface VideoService {
  getFeaturedForPlace(placeId: string): Promise<VideoDTO | null>;
  listForPlace(placeId: string): Promise<VideoDTO[]>;
  submitVideo(submission: VideoSubmissionInput): Promise<{ submissionId: string }>;
  listPendingSubmissions(): Promise<VideoSubmissionSummary[]>;
  approveSubmission(submissionId: string, adminUserId: string): Promise<{ videoId: string }>;
  rejectSubmission(submissionId: string, adminUserId: string, reason: string): Promise<void>;
  setFeatured(placeId: string, videoId: string): Promise<void>;
  recordView(videoId: string): Promise<void>;
  recordCompletion(videoId: string): Promise<void>;

  // ── Admin (Phase 11) ────────────────────────────────────────────────────
  /** Every PUBLISHED video across all places, most recent first — the admin video browser. */
  listRecent(limit?: number): Promise<VideoAdminSummary[]>;
}

export interface VideoAdminSummary extends VideoDTO {
  placeName: string;
  placeSlug: string;
  isFeatured: boolean;
  viewCount: number;
  completionCount: number;
  createdAt: Date;
}

export interface VideoDTO {
  id: string;
  placeId: string;
  url: string;
  posterUrl: string | null;
  durationSeconds: number | null;
  creatorName: string | null;
}

export interface VideoSubmissionInput {
  submittedByUserId: string;
  placeName: string;
  existingPlaceId?: string;
  videoUrl: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  categoryId?: string;
  regionId?: string;
  creatorName: string;
  instagram?: string;
  tiktok?: string;
  contactEmail: string;
  ownershipConfirmed: boolean;
}

export interface VideoSubmissionSummary {
  id: string;
  placeName: string;
  existingPlaceId: string | null;
  videoUrl: string;
  description: string | null;
  creatorName: string;
  instagram: string | null;
  tiktok: string | null;
  contactEmail: string;
  submittedByUserId: string;
  createdAt: Date;
}
