import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ReviewerConflict {
  id: string;
  phase_id: string;
  reviewer_id: string;
  registration_id: string;
  conflict_type: "self_registration" | "same_team" | "declared";
  detected_at: string;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  reviewer?: { name: string; email: string };
  applicant?: { name: string; email: string };
}

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

export function usePhaseConflicts(
  hackathonId: string | undefined,
  phaseId: string | undefined
) {
  return useQuery<{ data: ReviewerConflict[] }>({
    queryKey: ["phase-conflicts", hackathonId, phaseId],
    queryFn: () =>
      fetchJson<{ data: ReviewerConflict[] }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/conflicts`
      ),
    enabled: !!hackathonId && !!phaseId,
  });
}

export function useDetectConflicts(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      mutate<{ data: { detected: number; newConflicts: number } }>(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/conflicts`,
        "POST"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-conflicts", hackathonId, phaseId] });
    },
  });
}

export function useResolveConflict(hackathonId: string, phaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conflictId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/phases/${phaseId}/conflicts`,
        "PATCH",
        { conflictId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["phase-conflicts", hackathonId, phaseId] });
    },
  });
}
