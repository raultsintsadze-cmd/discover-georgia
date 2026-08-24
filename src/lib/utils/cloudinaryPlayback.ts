import "server-only";

/**
 * Normalizes video playback to H.264/mp4 via Cloudinary's "fetch" delivery
 * — Cloudinary pulls the source URL itself (our R2 public URL, via the
 * /api/media proxy — see r2.ts), transcodes on first request, and caches
 * the result on their CDN for every request after that. No upload/ingest
 * step, no change to how videos are stored — this only changes the URL
 * handed to <video src>, at read time, in VideoService.toDTO. Fixes the
 * "iPhone HEVC doesn't play on Windows/Chrome" problem transparently,
 * without needing to know which videos are actually HEVC.
 *
 * .webm sources are left alone — VP8/VP9 in WebM is already broadly
 * playable without conversion, so wrapping it would just spend a
 * transformation credit for no benefit.
 *
 * Unsigned fetch delivery — safe against abuse (someone using this
 * account to transcode arbitrary third-party URLs) only because
 * "Allowed fetch domains" is restricted in the Cloudinary dashboard
 * (Settings → Security) to this app's own media domain. That
 * restriction lives entirely on Cloudinary's side, same caveat as R2's
 * bucket CORS policy (see r2.ts) — nothing enforces it from this code.
 */
export function toH264PlaybackUrl(rawUrl: string): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return rawUrl; // not configured — fail open, serve the original

  if (rawUrl.toLowerCase().endsWith(".webm")) return rawUrl;

  return `https://res.cloudinary.com/${cloudName}/video/fetch/f_mp4,vc_h264/${encodeURIComponent(rawUrl)}`;
}
