import { fetchJson } from "@/lib/fetch-json";
import { useQuery } from "@tanstack/react-query";
import type { PlatformStats } from "@/lib/types";


export function usePlatformStats() {
  return useQuery<{ data: PlatformStats }>({
    queryKey: ["platform-stats"],
    queryFn: () => fetchJson<{ data: PlatformStats }>("/api/stats"),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
  });
}
