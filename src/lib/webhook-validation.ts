/**
 * Shared webhook URL validation — centralized SSRF protection.
 * Used by both POST /api/webhooks and PATCH /api/webhooks/[webhookId].
 */

const MAX_URL_LENGTH = 2048;

/**
 * Validate a webhook URL for correctness and SSRF safety.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateWebhookUrl(url: string): string | null {
  if (url.length > MAX_URL_LENGTH) {
    return `URL must be at most ${MAX_URL_LENGTH} characters`;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Invalid URL format";
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return "Webhook URL must use HTTPS (or HTTP for localhost)";
  }

  // Block private/internal addresses to prevent SSRF
  if (process.env.NODE_ENV === "production") {
    if (isBlockedHost(parsed.hostname)) {
      return "Webhook URL cannot target private or internal addresses";
    }
  }

  return null;
}

/**
 * Check if a hostname resolves to a private, loopback, link-local,
 * or cloud metadata address that should be blocked for SSRF prevention.
 */
function isBlockedHost(hostname: string): boolean {
  // Loopback
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  ) {
    return true;
  }

  // Cloud metadata endpoints (AWS, GCP, Azure)
  if (
    hostname === "169.254.169.254" ||
    hostname === "metadata.google.internal" ||
    hostname === "metadata.internal"
  ) {
    return true;
  }

  // Link-local (169.254.x.x)
  if (hostname.startsWith("169.254.")) {
    return true;
  }

  // RFC 1918 private ranges
  if (hostname.startsWith("10.")) return true;
  if (hostname.startsWith("192.168.")) return true;

  // 172.16.0.0 - 172.31.255.255 (RFC 1918)
  if (hostname.startsWith("172.")) {
    const secondOctet = parseInt(hostname.split(".")[1], 10);
    if (!isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
      return true;
    }
  }

  // IPv6 private ranges (ULA fc00::/7, link-local fe80::/10)
  const lower = hostname.toLowerCase();
  if (
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80") ||
    lower.startsWith("[fc") ||
    lower.startsWith("[fd") ||
    lower.startsWith("[fe80")
  ) {
    return true;
  }

  // Internal/local TLDs
  if (
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".localhost")
  ) {
    return true;
  }

  return false;
}
