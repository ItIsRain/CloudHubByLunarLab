import { type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hashApiKey, hasRequiredScope } from "@/lib/api-keys";

// =====================================================
// Dual Auth: Session Cookies OR API Key (Bearer token)
// =====================================================

interface SessionAuth {
  type: "session";
  userId: string;
  scopes: null;
}

interface ApiKeyAuth {
  type: "api_key";
  userId: string;
  scopes: string[];
  keyId: string;
}

interface Unauthenticated {
  type: "unauthenticated";
  error: string;
}

export type AuthResult = SessionAuth | ApiKeyAuth | Unauthenticated;

const API_KEY_PREFIX = "ch_key_";

/**
 * Authenticate a request via API key (Bearer token) or session cookie.
 * API key auth uses the admin client since there are no session cookies.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // 1. Check for API key in Authorization header
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();

    if (token.startsWith(API_KEY_PREFIX)) {
      return authenticateApiKey(token);
    }

    // Non-ch_key Bearer token — reject immediately
    return { type: "unauthenticated", error: "Invalid API key" };
  }

  // Detect malformed API key header (missing "Bearer " prefix)
  if (authHeader && authHeader.includes(API_KEY_PREFIX)) {
    return {
      type: "unauthenticated",
      error: "API key must be sent as 'Bearer <key>' in the Authorization header",
    };
  }

  // 2. Fall back to Supabase session cookie auth
  return authenticateSession();
}

async function authenticateApiKey(key: string): Promise<AuthResult> {
  const admin = getSupabaseAdminClient();
  const keyHash = hashApiKey(key);

  const { data, error } = await admin
    .from("api_keys")
    .select("id, user_id, scopes, status")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) {
    return { type: "unauthenticated", error: "Invalid API key" };
  }

  if (data.status !== "active") {
    return { type: "unauthenticated", error: "API key has been revoked" };
  }

  // Fire-and-forget: update last_used timestamp
  void admin
    .from("api_keys")
    .update({ last_used: new Date().toISOString() })
    .eq("id", data.id)
    .then();

  return {
    type: "api_key",
    userId: data.user_id as string,
    scopes: data.scopes as string[],
    keyId: data.id as string,
  };
}

async function authenticateSession(): Promise<AuthResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { type: "unauthenticated", error: "Not authenticated" };
  }

  return {
    type: "session",
    userId: user.id,
    scopes: null,
  };
}

/**
 * Check whether the request carries an API-key-shaped Authorization header
 * (valid Bearer or malformed). Useful for route guards that need to distinguish
 * "no auth attempted" from "API key auth attempted".
 */
export function hasApiKeyHeader(request: NextRequest): boolean {
  const h = request.headers.get("authorization");
  return !!(h?.startsWith("Bearer ") || h?.includes(API_KEY_PREFIX));
}

/**
 * Assert that the auth result has the required scope for the given pathname.
 * Session auth always passes (full access). API key auth checks scopes.
 * Returns an error string if unauthorized, or null if OK.
 */
export function assertScope(
  auth: SessionAuth | ApiKeyAuth,
  pathname: string
): string | null {
  if (auth.type === "session") return null;

  if (!hasRequiredScope(auth.scopes, pathname)) {
    return `API key lacks required scope for ${pathname}`;
  }

  return null;
}
