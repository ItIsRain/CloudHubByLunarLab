/**
 * Custom error that preserves HTTP status code for retry logic.
 */
export class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

/**
 * Typed JSON fetch helper for TanStack Query hooks.
 * Throws FetchError on non-OK responses with the server error message and status code.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new FetchError(
      json.error || `Request failed: ${res.status}`,
      res.status
    );
  }
  return res.json();
}
