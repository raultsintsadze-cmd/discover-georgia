import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/api/rateLimit";

// Cost-bearing or side-effecting endpoints named in docs/api.md §4 —
// deliberately not applied blanket to every route. Keyed by IP only (not
// session) so this file stays dependency-free of the auth config, which
// pulls in Prisma/bcrypt and isn't safe to load in the Edge runtime
// middleware runs under.
const RATE_LIMITS: { method: string; test: (pathname: string) => boolean; limit: number; windowMs: number }[] = [
  { method: "POST", test: (p) => p === "/api/videos/submissions", limit: 5, windowMs: 60_000 },
  { method: "POST", test: (p) => p.startsWith("/api/ai/conversations"), limit: 20, windowMs: 60_000 },
  { method: "POST", test: (p) => p === "/api/trip-requests", limit: 10, windowMs: 60_000 },
  { method: "POST", test: (p) => p === "/api/storage/upload-url", limit: 10, windowMs: 60_000 },
];

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// The video submission form PUTs the file straight from the browser to a
// presigned R2 URL (never through our server — see
// src/components/video/VideoSubmissionForm.tsx), so the storage endpoint
// needs an explicit connect-src allowance or the browser blocks the XHR.
const storageConnectSrc = process.env.STORAGE_ENDPOINT ? ` ${process.env.STORAGE_ENDPOINT}` : "";

// A pragmatic baseline, not a perfect CSP: Next's inline hydration
// bootstrap needs 'unsafe-inline' without nonce plumbing, and the Map
// screen needs Google's domains explicitly allow-listed. 'unsafe-eval' is
// dev-only — Next's dev server (webpack HMR/Fast Refresh) evaluates
// module code as strings, which 'unsafe-inline' does NOT cover (that
// only permits inline <script> tags, not eval()/Function()); production
// builds don't need it, so it's dropped there for a strictly tighter CSP.
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === "production" ? "" : "'unsafe-eval' "}https://maps.googleapis.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https://maps.googleapis.com https://*.google.com${storageConnectSrc}`,
  "frame-src 'self' https://www.google.com",
  "frame-ancestors 'none'",
].join("; ");

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = RATE_LIMITS.find((r) => r.method === request.method && r.test(pathname));
  if (rule) {
    const key = `${rule.method} ${pathname} ${clientIp(request)}`;
    const result = checkRateLimit(key, rule.limit, rule.windowMs);
    if (!result.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests — please slow down." } },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }
  }

  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
