import { randomBytes, createHash } from "crypto";

// =====================================================
// API Key Scopes
// =====================================================

export const API_SCOPES = ["events", "hackathons", "users", "analytics", "webhooks"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

/** Maps each scope to the API route prefixes it authorizes */
const SCOPE_ROUTE_MAP: Record<ApiScope, string[]> = {
  events: ["/api/events"],
  hackathons: ["/api/hackathons"],
  users: ["/api/users"],
  analytics: ["/api/stats"],
  webhooks: ["/api/webhooks"],
};

// =====================================================
// Key Generation & Hashing
// =====================================================

const KEY_PREFIX = "ch_key_";
const KEY_RANDOM_BYTES = 30;
const DISPLAY_PREFIX_LENGTH = 12;

const BASE62_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function toBase62(buffer: Buffer): string {
  let result = "";
  for (const byte of buffer) {
    result += BASE62_CHARS[byte % 62];
  }
  return result;
}

/**
 * Generate a cryptographically secure API key.
 * Format: ch_key_<30 base62 chars> (total ~37 chars)
 */
export function generateApiKey(): string {
  const random = randomBytes(KEY_RANDOM_BYTES);
  return KEY_PREFIX + toBase62(random);
}

/**
 * SHA-256 hash of the full API key for storage.
 * SHA-256 is appropriate because keys are high-entropy random values,
 * not user-chosen passwords — bcrypt is unnecessary.
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Extract the first 12 characters of the key for masked display.
 */
export function extractPrefix(key: string): string {
  return key.slice(0, DISPLAY_PREFIX_LENGTH);
}

/**
 * Check if the given scopes authorize access to the requested pathname.
 */
export function hasRequiredScope(scopes: string[], pathname: string): boolean {
  return scopes.some((scope) => {
    const allowedPrefixes = SCOPE_ROUTE_MAP[scope as ApiScope];
    if (!allowedPrefixes) return false;
    return allowedPrefixes.some((prefix) => pathname.startsWith(prefix));
  });
}

/**
 * Validate that all provided scopes are valid ApiScope values.
 */
export function validateScopes(scopes: string[]): scopes is ApiScope[] {
  return scopes.every((s) => (API_SCOPES as readonly string[]).includes(s));
}

/** Maximum number of active API keys per user */
export const MAX_ACTIVE_KEYS = 10;
