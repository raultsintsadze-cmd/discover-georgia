/** Owns creator applications and public creator profiles. */
export interface CreatorService {
  getProfile(creatorId: string): Promise<CreatorProfile | null>;
  applyAsCreator(userId: string, input: CreatorApplicationInput): Promise<{ creatorId: string }>;
  approve(creatorId: string, adminUserId: string): Promise<void>;
  reject(creatorId: string, adminUserId: string, reason: string): Promise<void>;
  /** The admin moderation queue (Phase 11). */
  listPendingApplications(): Promise<CreatorApplicationSummary[]>;
}

export interface CreatorApplicationSummary {
  id: string;
  displayName: string;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  applicantEmail: string | null;
  createdAt: Date;
}

export interface CreatorApplicationInput {
  displayName: string;
  bio?: string;
  instagram?: string;
  tiktok?: string;
}

export interface CreatorProfile {
  id: string;
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  approvedPlaceCount: number;
  approvedVideoCount: number;
}
