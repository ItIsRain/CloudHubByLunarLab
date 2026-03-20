import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────

interface CriteriaScore {
  criteriaId: string;
  score: number;
  feedback?: string;
}

interface ScoringCriteria {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight: number;
}

interface RegistrationField {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  description?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  order: number;
  sectionId?: string;
}

interface PhaseConfig {
  id: string;
  name: string;
  status: string;
  scoringScaleMax: number | null;
  requireRecommendation: boolean;
  isWeighted: boolean;
  scoringCriteria: ScoringCriteria[];
  blindReview: boolean;
  reviewerCount: number;
  campusFilter: string | null;
  registrationFields?: RegistrationField[];
}

interface ReviewerAssignment {
  id: string;
  phaseId: string;
  reviewerId: string;
  registrationId: string;
  assignedAt: string;
  applicantName: string | null;
  applicantEmail: string | null;
  reviewer?: { name: string; email: string } | null;
  // Raw registration data when available (reviewer ?mine=true with full data)
  registration?: {
    id: string;
    user_id: string;
    status: string;
    form_data: Record<string, unknown> | null;
    applicant: { id: string; name: string; email: string } | null;
  } | null;
}

interface PhaseScore {
  id: string;
  phase_id: string;
  reviewer_id: string;
  registration_id: string;
  criteria_scores: CriteriaScore[];
  total_score: number;
  recommendation: string | null;
  overall_feedback: string | null;
  flagged: boolean;
  submitted_at: string;
  updated_at: string;
  registration?: {
    id: string;
    applicant: { id: string; name: string; email: string } | null;
  } | null;
}

// ── Phase config ─────────────────────────────────────────

export function usePhaseConfig(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: PhaseConfig }>({
    queryKey: ["phase-config", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: PhaseConfig }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

// ── My assignments for a phase (reviewer view) ──────────

export function useMyPhaseAssignments(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: ReviewerAssignment[] }>({
    queryKey: ["phase-assignments-mine", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: ReviewerAssignment[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/assignments?mine=true`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

// ── My scores for a phase ────────────────────────────────

export function useMyPhaseScores(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: PhaseScore[] }>({
    queryKey: ["phase-scores-mine", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: PhaseScore[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/scores`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

// ── Submit a phase score ─────────────────────────────────

interface SubmitScorePayload {
  hackathonId: string;
  phaseId: string;
  registrationId: string;
  criteriaScores: CriteriaScore[];
  recommendation?: string;
  overallFeedback?: string;
  flagged?: boolean;
}

export function useSubmitPhaseScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ hackathonId, phaseId, ...payload }: SubmitScorePayload) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/scores`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to submit score");
      }
      return res.json() as Promise<{ data: PhaseScore }>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["phase-scores-mine", variables.hackathonId, variables.phaseId],
      });
      qc.invalidateQueries({
        queryKey: ["phase-assignments-mine", variables.hackathonId, variables.phaseId],
      });
    },
  });
}

// ── My reviewer phases (dashboard discovery) ────────────

interface ReviewerPhase {
  reviewerId: string;
  reviewerStatus: string;
  invitedAt: string;
  acceptedAt: string | null;
  phaseId: string;
  phaseName: string;
  phaseType: string | null;
  phaseStatus: string;
  campusFilter: string | null;
  hackathonId: string;
  hackathonName: string;
  hackathonTagline: string | null;
  hackathonStatus: string;
  hackathonBanner: string | null;
}

// ── Finalists for a phase (organizer view) ──────────────

interface PhaseFinalist {
  id: string;
  phaseId: string;
  registrationId: string;
  sourcePhaseId: string | null;
  sourceScore: number | null;
  rank: number | null;
  awardCategoryId: string | null;
  awardLabel: string | null;
  selectedAt: string;
  selectedBy: string | null;
  applicantName: string;
  applicantEmail: string;
  sourcePhaseName: string | null;
  sourceCampus: string | null;
}

export function usePhaseFinalists(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: PhaseFinalist[] }>({
    queryKey: ["phase-finalists", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: PhaseFinalist[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/finalists`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

export function useAutoSelectFinalists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hackathonId,
      phaseId,
      topN,
    }: {
      hackathonId: string;
      phaseId: string;
      topN: number;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/finalists`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "auto", topN }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to auto-select finalists");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["phase-finalists", variables.hackathonId, variables.phaseId],
      });
    },
  });
}

export function useManualSelectFinalists() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hackathonId,
      phaseId,
      selections,
    }: {
      hackathonId: string;
      phaseId: string;
      selections: Array<{
        registrationId: string;
        sourcePhaseId?: string;
        sourceScore?: number;
        rank?: number;
        awardCategoryId?: string;
        awardLabel?: string;
      }>;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/finalists`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "manual", selections }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save finalists");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["phase-finalists", variables.hackathonId, variables.phaseId],
      });
    },
  });
}

// ── My reviewer phases (dashboard discovery) ────────────

export function useMyReviewerPhases() {
  return useQuery<{ data: ReviewerPhase[] }>({
    queryKey: ["my-reviewer-phases"],
    queryFn: () => fetchJson<{ data: ReviewerPhase[] }>("/api/hackathons/my-phases"),
  });
}

// ── Judge score history (all hackathons) ─────────────

interface ScoreHistoryPhase {
  reviewerId: string;
  reviewerStatus: string;
  invitedAt: string;
  acceptedAt: string | null;
  phaseId: string;
  phaseName: string;
  phaseType: string | null;
  phaseStatus: string;
  campusFilter: string | null;
  blindReview: boolean;
  scoringCriteria: ScoringCriteria[];
  hackathonId: string;
  hackathonName: string;
  hackathonTagline: string | null;
  hackathonStatus: string;
  hackathonBanner: string | null;
  totalAssigned: number;
  totalScored: number;
  averageScore: number | null;
  scores: PhaseScore[];
}

interface ScoreHistoryStats {
  hackathonCount: number;
  scoreCount: number;
  averageScore: number;
}

interface ScoreHistoryResponse {
  data: {
    phases: ScoreHistoryPhase[];
    stats: ScoreHistoryStats;
  };
}

export function useJudgeScoreHistory() {
  return useQuery<ScoreHistoryResponse>({
    queryKey: ["judge-score-history"],
    queryFn: () => fetchJson<ScoreHistoryResponse>("/api/judge/scores"),
  });
}

// ── Score Review Dashboard (organizer aggregate view) ──

interface ScoreReviewPhase {
  id: string;
  name: string;
  phase_type: string;
  status: string;
  scoring_scale_max: number | null;
  require_recommendation: boolean | null;
  is_weighted: boolean | null;
  scoring_criteria: ScoringCriteria[] | null;
  sort_order: number;
}

interface ScoreReviewRegistration {
  id: string;
  user_id: string;
  status: string;
  applicant: { id: string; name: string; email: string; avatar: string | null } | null;
}

interface ScoreReviewScore {
  id: string;
  phase_id: string;
  reviewer_id: string;
  registration_id: string;
  criteria_scores: CriteriaScore[];
  total_score: number;
  recommendation: string | null;
  overall_feedback: string | null;
  flagged: boolean;
  submitted_at: string;
}

interface ScoreReviewDecision {
  id: string;
  phase_id: string;
  registration_id: string;
  decision: string;
  recommendation_count: number;
  total_reviewers: number;
  average_score: number | null;
  is_override: boolean;
  rationale: string | null;
}

interface ScoreReviewData {
  phases: ScoreReviewPhase[];
  registrations: ScoreReviewRegistration[];
  scores: ScoreReviewScore[];
  decisions: ScoreReviewDecision[];
}

export function useScoreReview(hackathonId: string | undefined) {
  return useQuery<{ data: ScoreReviewData }>({
    queryKey: ["score-review", hackathonId],
    queryFn: () =>
      fetchJson<{ data: ScoreReviewData }>(
        `/api/hackathons/${hackathonId}/score-review`
      ),
    enabled: !!hackathonId,
  });
}

export type {
  CriteriaScore,
  ScoringCriteria,
  PhaseConfig,
  RegistrationField,
  ReviewerAssignment,
  PhaseScore,
  ReviewerPhase,
  ScoreHistoryPhase,
  ScoreHistoryStats,
  ScoreReviewPhase,
  ScoreReviewRegistration,
  ScoreReviewScore,
  ScoreReviewDecision,
  ScoreReviewData,
};
