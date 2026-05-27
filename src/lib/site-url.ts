import type { NextRequest } from "next/server";

/**
 * Resolve the public site URL for outgoing links (emails, invitations, etc.).
 *
 * Precedence:
 *   1. `NEXT_PUBLIC_SITE_URL` env var (canonical, prod)
 *   2. `x-forwarded-host` + `x-forwarded-proto` headers (behind a reverse proxy)
 *   3. The incoming request's own origin
 *   4. `http://localhost:3000` as a last-resort dev fallback
 *
 * Always returns a URL with no trailing slash so callers can safely append paths.
 */
export function getSiteUrl(request?: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");

  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    if (forwardedHost) {
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (process.env.NODE_ENV === "development" ? "http" : "https");
      return `${proto}://${forwardedHost}`.replace(/\/$/, "");
    }

    const origin = request.nextUrl?.origin;
    if (origin) return origin.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
