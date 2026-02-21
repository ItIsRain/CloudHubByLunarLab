import { useQuery } from "@tanstack/react-query";
import type { PlatformStats } from "@/lib/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function usePlatformStats() {
  return useQuery<{ data: PlatformStats }>({
    queryKey: ["platform-stats"],
    queryFn: () => fetchJson<{ data: PlatformStats }>("/api/stats"),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
}
