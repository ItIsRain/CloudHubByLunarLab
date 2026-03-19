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

// ── New analytics types ──────────────────────────────────

export interface ReviewerActivityEntry {
  reviewerId: string;
  name: string;
  email: string;
  status: string;
  assignedCount: number;
  scoredCount: number;
  completionRate: number;
  avgScoreGiven: number;
  recommendCount: number;
  doNotRecommendCount: number;
  flaggedCount: number;
}

export interface ReviewerActivity {
  reviewers: ReviewerActivityEntry[];
  summary: {
    totalInvited: number;
    totalAccepted: number;
    totalDeclined: number;
    avgCompletionRate: number;
  };
}

export interface HistogramBucket {
  bucket: string;
  count: number;
}

export interface ScoreStats {
  histogram: HistogramBucket[];
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  totalScores: number;
}

export interface PhaseScoreStats extends ScoreStats {
  phaseId: string;
  phaseName: string;
}

export interface ScoreDistributions {
  overall: ScoreStats;
  byPhase: PhaseScoreStats[];
}

export interface PhaseDecisionOutcome {
  phaseId: string;
  phaseName: string;
  total: number;
  advance: number;
  borderline: number;
  doNotAdvance: number;
  overrideCount: number;
  advanceRate: number;
}

export interface DecisionOutcomes {
  byPhase: PhaseDecisionOutcome[];
  overall: {
    total: number;
    advance: number;
    borderline: number;
    doNotAdvance: number;
    overrideCount: number;
  };
}

export interface FunnelStage {
  stage: string;
  count: number;
  percentOfTotal: number;
  dropOff: number;
}

export interface ConversionRates {
  funnel: FunnelStage[];
}

export interface TimeStat {
  avgHours: number;
  medianHours: number;
  minHours: number;
  maxHours: number;
  sampleSize: number;
}

export interface ProcessingTimes {
  reviewerResponse: TimeStat;
  screeningTurnaround: TimeStat;
  scoringTurnaround: TimeStat;
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
  // New analytics
  reviewerActivity?: ReviewerActivity;
  scoreDistributions?: ScoreDistributions;
  decisionOutcomes?: DecisionOutcomes;
  conversionRates?: ConversionRates;
  processingTimes?: ProcessingTimes;
}

export function useHackathonAnalytics(hackathonId: string | undefined) {
  return useQuery<{ data: HackathonAnalytics }>({
    queryKey: ["hackathon-analytics", hackathonId],
    queryFn: () =>
      fetchJson(`/api/hackathons/${hackathonId}/analytics`),
    enabled: !!hackathonId,
  });
}
