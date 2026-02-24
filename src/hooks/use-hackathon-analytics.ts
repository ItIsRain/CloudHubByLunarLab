import { fetchJson } from "@/lib/fetch-json";
import { useQuery } from "@tanstack/react-query";


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
