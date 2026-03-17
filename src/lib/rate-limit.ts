/**
 * Simple in-memory rate limiter for API routes.
 *
 * Limitations: per-process only — does not persist across restarts or scale
 * across multiple serverless instances. For production at scale, swap to a
 * Redis-backed solution.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Periodically purge stale entries to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function getStore(namespace: string): Map<string, RateLimitEntry> {
  let store = stores.get(namespace);
  if (!store) {
    store = new Map();
    stores.set(namespace, store);

    // Auto-cleanup for this namespace
    if (typeof globalThis !== "undefined") {
      const interval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of store!.entries()) {
          entry.timestamps = entry.timestamps.filter(
            (t) => now - t < 15 * 60 * 1000
          );
          if (entry.timestamps.length === 0) store!.delete(key);
        }
      }, CLEANUP_INTERVAL_MS);
      // Don't block Node.js process shutdown
      if (typeof interval === "object" && "unref" in interval) {
        interval.unref();
      }
    }
  }
  return store;
}

export interface RateLimitConfig {
  /** Unique namespace for this limiter (e.g. "auth-login") */
  namespace: string;
  /** Maximum number of requests allowed within the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check and record a rate limit hit for the given key (typically an IP).
 * Returns whether the request should be blocked.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const store = getStore(config.namespace);
  const now = Date.now();

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Prune timestamps outside the window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.limit) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = config.windowMs - (now - oldestInWindow);
    return {
      limited: true,
      remaining: 0,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  entry.timestamps.push(now);
  return {
    limited: false,
    remaining: config.limit - entry.timestamps.length,
    retryAfterMs: 0,
  };
}

/**
 * Extract the client IP from a NextRequest.
 *
 * Prefer x-real-ip (set by trusted reverse proxy). If unavailable, use the
 * LAST value in x-forwarded-for — the rightmost entry is the one appended by
 * the trusted proxy and cannot be spoofed by the client (the client can only
 * prepend values to the left).
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    // Use the rightmost entry (last proxy-appended value)
    return parts[parts.length - 1] || "unknown";
  }

  return "unknown";
}
