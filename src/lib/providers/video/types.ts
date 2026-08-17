/**
 * Video CDN / streaming abstraction. Default implementation: Mux.
 * VideoService is the only caller — components never talk to this directly,
 * they render the playbackUrl/posterUrl that VideoService returns.
 */
export interface VideoProvider {
  /** Returns a direct-upload URL the client can PUT/POST to. */
  createUploadUrl(): Promise<{ uploadUrl: string; assetRef: string }>;
  getAsset(assetRef: string): Promise<VideoAsset>;
  deleteAsset(assetRef: string): Promise<void>;
}

export interface VideoAsset {
  assetRef: string;
  status: "processing" | "ready" | "errored";
  playbackUrl: string | null;
  posterUrl: string | null;
  durationSeconds: number | null;
}
