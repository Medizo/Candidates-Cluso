/**
 * In-memory sliding-window rate limiter.
 *
 * NOTE: On serverless platforms (Vercel), each cold start resets the store.
 * For production-grade protection, consider Redis-backed rate limiting.
 * This still provides meaningful protection per warm instance.
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterMs: number } {
  cleanupExpired(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  entry.timestamps.push(now);
  return { allowed: true, retryAfterMs: 0 };
}

/**
 * Convenience constants for OTP rate limiting.
 */
export const OTP_RATE_LIMITS = {
  /** Max OTP send requests per email in the window */
  PER_EMAIL_MAX: 3,
  /** Max OTP send requests per IP in the window */
  PER_IP_MAX: 10,
  /** Window duration in milliseconds (15 minutes) */
  WINDOW_MS: 15 * 60 * 1000,
} as const;
