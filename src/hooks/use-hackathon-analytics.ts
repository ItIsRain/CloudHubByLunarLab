import { fetchJson } from "@/lib/fetch-json";
import { useQuery } from "@tanstack/react-query";

export interface ScoringPhaseProgress {
  phaseId: string;
  phaseName: string;
  scored: number;
  total: number;
}

export interface FunnelData {
  applied: number;
  screened: number;
  eligible: number;
  accepted: number;
  confirmed: number;
}

export interface RsvpStats {
  confirmed: number;
  pending: number;
  declined: number;
}

export interface ScreeningProgress {
  eligible: number;
  ineligible: number;
  underReview: number;
  pending: number;
  screened: number;
  total: number;
}

export interface RegistrationDateEntry {
  date: string;
  count: number;
  cumulative: number;
}

export interface CampusPerformance {
  total: number;
  screened: number;
  eligible: number;
  accepted: number;
  confirmed: number;
}

export interface Demographics {
  ageDistribution: Record<string, number>;
  genderDistribution: Record<string, number>;
  nationalityDistribution: Record<string, number>;
}

export interface WinnerStats {
  total: number;
  confirmed: number;
  locked: number;
}

export interface HackathonAnalytics {
  registrationsByStatus: Record<string, number>;
  registrationTimeline: { date: string; count: number }[];
  registrationsByDate: RegistrationDateEntry[];
  registrationsByCampus: Record<string, number>;
  teamCount: number;
  submissionCount: number;
  trackDistribution: { track: string; count: number }[];
  scoringProgress: { scored: number; total: number };
  scoringProgressByPhase: ScoringPhaseProgress[];
  rsvpStats: RsvpStats;
  funnelData: FunnelData;
  screeningProgress: ScreeningProgress;
  demographics?: Demographics;
  campusPerformance?: Record<string, CampusPerformance>;
  sectorDistribution?: Record<string, number>;
  winnerStats?: WinnerStats;
}

export function useHackathonAnalytics(hackathonId: string | undefined) {
  return useQuery<{ data: HackathonAnalytics }>({
    queryKey: ["hackathon-analytics", hackathonId],
    queryFn: () =>
      fetchJson(`/api/hackathons/${hackathonId}/analytics`),
    enabled: !!hackathonId,
  });
}
