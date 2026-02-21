import { useQuery } from "@tanstack/react-query";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface HackathonAnalytics {
  registrationsByStatus: Record<string, number>;
  registrationTimeline: { date: string; count: number }[];
  teamCount: number;
  submissionCount: number;
  trackDistribution: { track: string; count: number }[];
  scoringProgress: { scored: number; total: number };
}

export function useHackathonAnalytics(hackathonId: string | undefined) {
  return useQuery<{ data: HackathonAnalytics }>({
    queryKey: ["hackathon-analytics", hackathonId],
    queryFn: () =>
      fetchJson(`/api/hackathons/${hackathonId}/analytics`),
    enabled: !!hackathonId,
  });
}
