import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface AwardTrack {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  track_type: "sector" | "innovation" | "special" | "custom";
  scoring_criteria: ScoringCriterion[];
  is_weighted: boolean;
  scoring_scale_max: number;
  phase_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ScoringCriterion {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
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

export function useAwardTracks(hackathonId: string | undefined) {
  return useQuery<{ data: AwardTrack[] }>({
    queryKey: ["award-tracks", hackathonId],
    queryFn: () =>
      fetchJson<{ data: AwardTrack[] }>(
        `/api/hackathons/${hackathonId}/award-tracks`
      ),
    enabled: !!hackathonId,
  });
}

export function useCreateAwardTrack(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      tracks:
        | {
            name: string;
            description?: string | null;
            track_type: string;
            scoring_criteria?: ScoringCriterion[];
            is_weighted?: boolean;
            scoring_scale_max?: number;
            phase_id?: string | null;
            display_order?: number;
          }
        | Array<{
            name: string;
            description?: string | null;
            track_type: string;
            scoring_criteria?: ScoringCriterion[];
            is_weighted?: boolean;
            scoring_scale_max?: number;
            phase_id?: string | null;
            display_order?: number;
          }>
    ) =>
      mutate<{ data: AwardTrack[] }>(
        `/api/hackathons/${hackathonId}/award-tracks`,
        "POST",
        tracks
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["award-tracks", hackathonId] });
    },
  });
}

export function useUpdateAwardTrack(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      trackId,
      ...data
    }: {
      trackId: string;
      name?: string;
      description?: string | null;
      track_type?: string;
      scoring_criteria?: ScoringCriterion[];
      is_weighted?: boolean;
      scoring_scale_max?: number;
      phase_id?: string | null;
      display_order?: number;
    }) =>
      mutate<{ data: AwardTrack }>(
        `/api/hackathons/${hackathonId}/award-tracks`,
        "PATCH",
        { trackId, ...data }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["award-tracks", hackathonId] });
    },
  });
}

export function useDeleteAwardTrack(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (trackId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/award-tracks`,
        "DELETE",
        { trackId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["award-tracks", hackathonId] });
    },
  });
}
