import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WinnerRegistration {
  id: string;
  user_id: string;
  status: string;
  form_data: Record<string, unknown> | null;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    avatar: string | null;
  } | null;
}

export interface WinnerTrack {
  id: string;
  name: string;
  track_type: string;
}

export interface CompetitionWinner {
  id: string;
  hackathon_id: string;
  award_track_id: string | null;
  registration_id: string;
  phase_id: string | null;
  award_label: string;
  rank: number | null;
  final_score: number | null;
  confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  locked: boolean;
  locked_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  registration: WinnerRegistration | null;
  track: WinnerTrack | null;
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

export function useWinners(hackathonId: string | undefined) {
  return useQuery<{ data: CompetitionWinner[] }>({
    queryKey: ["winners", hackathonId],
    queryFn: () =>
      fetchJson<{ data: CompetitionWinner[] }>(
        `/api/hackathons/${hackathonId}/winners`
      ),
    enabled: !!hackathonId,
  });
}

export function useAddWinner(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      winners:
        | {
            registration_id: string;
            award_label: string;
            award_track_id?: string | null;
            phase_id?: string | null;
            rank?: number | null;
            final_score?: number | null;
            notes?: string | null;
          }
        | Array<{
            registration_id: string;
            award_label: string;
            award_track_id?: string | null;
            phase_id?: string | null;
            rank?: number | null;
            final_score?: number | null;
            notes?: string | null;
          }>
    ) =>
      mutate<{ data: CompetitionWinner[] }>(
        `/api/hackathons/${hackathonId}/winners`,
        "POST",
        winners
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["winners", hackathonId] });
    },
  });
}

export function useUpdateWinner(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      winnerId,
      ...data
    }: {
      winnerId: string;
      award_label?: string;
      award_track_id?: string | null;
      phase_id?: string | null;
      rank?: number | null;
      final_score?: number | null;
      confirmed?: boolean;
      locked?: boolean;
      notes?: string | null;
    }) =>
      mutate<{ data: CompetitionWinner }>(
        `/api/hackathons/${hackathonId}/winners`,
        "PATCH",
        { winnerId, ...data }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["winners", hackathonId] });
    },
  });
}

export function useRemoveWinner(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (winnerId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/winners`,
        "DELETE",
        { winnerId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["winners", hackathonId] });
    },
  });
}
