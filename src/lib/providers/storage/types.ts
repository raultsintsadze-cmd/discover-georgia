export interface StorageObject {
  body: ReadableStream<Uint8Array>;
  contentType: string | null;
  contentLength: number | null;
  contentRange: string | null;
  status: 200 | 206;
}

/**
 * Object storage abstraction for video and other media. Default
 * implementation: S3-compatible (Cloudflare R2).
 */
export interface StorageProvider {
  getSignedUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
  /**
   * Streams an object back out. Used by the media-proxy route
   * (src/app/api/media/[...key]/route.ts) — the only path getPublicUrl
   * can return while STORAGE_PUBLIC_BASE_URL is unset. Accepts an HTTP
   * Range header so <video> scrubbing/seeking works.
   */
  getObject(key: string, range?: string): Promise<StorageObject>;
}
