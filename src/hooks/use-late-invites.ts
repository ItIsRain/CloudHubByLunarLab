import { fetchJson } from "@/lib/fetch-json";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface LateInviteClaim {
  id: string;
  user_id: string;
  claimed_at: string;
  user?: { name: string | null; email: string | null } | null;
}

export interface LateInvite {
  id: string;
  hackathon_id: string;
  token: string;
  label: string | null;
  email: string | null;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  claims: LateInviteClaim[];
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

export function useLateInvites(hackathonId: string | undefined) {
  return useQuery<{ data: LateInvite[] }>({
    queryKey: ["late-invites", hackathonId],
    queryFn: () =>
      fetchJson(`/api/hackathons/${hackathonId}/late-invites`),
    enabled: !!hackathonId,
  });
}

export function useCreateLateInvite(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      label?: string | null;
      email?: string | null;
      max_uses?: number;
      expires_at?: string | null;
    }) =>
      mutate<{ data: LateInvite }>(
        `/api/hackathons/${hackathonId}/late-invites`,
        "POST",
        payload
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["late-invites", hackathonId] });
    },
  });
}

export function useUpdateLateInvite(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inviteId,
      ...patch
    }: {
      inviteId: string;
      label?: string | null;
      email?: string | null;
      max_uses?: number;
      expires_at?: string | null;
      revoke?: boolean;
    }) =>
      mutate<{ data: LateInvite }>(
        `/api/hackathons/${hackathonId}/late-invites/${inviteId}`,
        "PATCH",
        patch
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["late-invites", hackathonId] });
    },
  });
}

export function useDeleteLateInvite(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) =>
      mutate<{ message: string }>(
        `/api/hackathons/${hackathonId}/late-invites/${inviteId}`,
        "DELETE"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["late-invites", hackathonId] });
    },
  });
}
