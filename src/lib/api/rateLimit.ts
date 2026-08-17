/**
 * In-memory, single-process rate limiting. Not distributed — this is a
 * process-local Map, so it resets on redeploy and doesn't share state
 * across multiple server instances. That's the honest limitation until
 * REDIS_URL (see .env.example, docs/api.md §4) is actually configured
 * and this is swapped for a Redis-backed token bucket; it's still a real
 * guardrail for the current single-instance deployment, not a no-op.
 */
const buckets = new Map<string, { count: number; windowStart: number }>();

// Periodically forget old buckets so this Map can't grow unbounded over
// a long-running process's lifetime.
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > SWEEP_INTERVAL_MS) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Fixed-window counter: at most `limit` requests per `windowMs` per key. */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterSeconds = Math.ceil((bucket.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}
