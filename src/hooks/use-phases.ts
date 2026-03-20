import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CompetitionPhase,
  PhaseReviewer,
  ReviewerAssignment,
  PhaseScore,
  PhaseDecision,
} from "@/lib/types";

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Phase CRUD ────────────────────────────────────────────

export function usePhases(hackathonId: string | undefined) {
  return useQuery<{ data: CompetitionPhase[] }>({
    queryKey: ["phases", hackathonId],
    queryFn: () =>
      fetchJson<{ data: CompetitionPhase[] }>(
        `/api/hackathons/${hackathonId}/phases`
      ),
    enabled: !!hackathonId,
  });
}

export function usePhase(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: CompetitionPhase }>({
    queryKey: ["phases", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: CompetitionPhase }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

export function useCreatePhase(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phase: Partial<CompetitionPhase>) =>
      mutate<{ data: CompetitionPhase }>(
        `/api/hackathons/${hackathonId}/phases`, "POST", phase
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

export function useUpdatePhase(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<CompetitionPhase>) =>
      mutate<{ data: CompetitionPhase }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}`, "PATCH", updates
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

export function useDeletePhase(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (phaseId: string) =>
      mutate(`/api/hackathons/${hackathonId}/phases/${phaseId}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

// ── Reviewers ─────────────────────────────────────────────

export function usePhaseReviewers(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: PhaseReviewer[] }>({
    queryKey: ["phase-reviewers", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: PhaseReviewer[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/reviewers`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

export function useAddPhaseReviewer(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewer: { userId: string; name: string; email: string }) =>
      mutate<{ data: PhaseReviewer }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/reviewers`, "POST", reviewer
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-reviewers", hackathonId, phaseId] });
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

export function useRemovePhaseReviewer(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewerId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/reviewers`, "DELETE", { reviewerId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-reviewers", hackathonId, phaseId] });
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

// ── Assignments ───────────────────────────────────────────

export function usePhaseAssignments(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: ReviewerAssignment[] }>({
    queryKey: ["phase-assignments", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: ReviewerAssignment[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/assignments`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

export function useAutoAssign(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { reviewerId?: string; mode?: "auto" | "all" | "single"; registrationId?: string }) =>
      mutate<{ data: { created: number; totalApplicants: number; totalReviewers: number } }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/assignments`, "POST",
        opts ?? {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-assignments", hackathonId, phaseId] });
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

export function useClearAssignments(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      mutate(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/assignments`, "DELETE", {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-assignments", hackathonId, phaseId] });
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

export function useRemoveAssignment(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/assignments`, "DELETE",
        { assignmentId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-assignments", hackathonId, phaseId] });
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

// ── Scores ────────────────────────────────────────────────

export function usePhaseScores(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: PhaseScore[] }>({
    queryKey: ["phase-scores", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: PhaseScore[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/scores`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

export function useSubmitPhaseScore(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (score: {
      registrationId: string;
      criteriaScores: { criteriaId: string; score: number; feedback?: string }[];
      recommendation?: string;
      overallFeedback?: string;
      flagged?: boolean;
    }) =>
      mutate<{ data: PhaseScore }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/scores`, "POST", score
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-scores", hackathonId, phaseId] });
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

// ── Decisions ─────────────────────────────────────────────

export function usePhaseDecisions(hackathonId: string | undefined, phaseId: string | undefined) {
  return useQuery<{ data: PhaseDecision[] }>({
    queryKey: ["phase-decisions", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: PhaseDecision[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/decisions`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

export function useRunDecisions(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (override?: { registrationId: string; decision: string; rationale?: string }) =>
      mutate(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/decisions`, "POST", override || {}
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-decisions", hackathonId, phaseId] });
      qc.invalidateQueries({ queryKey: ["phases", hackathonId] });
    },
  });
}

export function useOverrideDecision(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { registrationId: string; decision: string; rationale?: string }) =>
      mutate(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/decisions`, "PATCH", data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-decisions", hackathonId, phaseId] });
    },
  });
}
