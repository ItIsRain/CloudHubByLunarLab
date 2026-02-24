/**
 * Typed JSON fetch helper for TanStack Query hooks.
 * Throws on non-OK responses with the server error message.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
