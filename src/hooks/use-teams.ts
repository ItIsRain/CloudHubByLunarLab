import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Team, PaginatedResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

interface TeamFilters {
  hackathonId?: string;
  userId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

function buildTeamParams(filters?: TeamFilters): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.hackathonId) params.set("hackathonId", filters.hackathonId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useTeams(filters?: TeamFilters) {
  return useQuery<PaginatedResponse<Team>>({
    queryKey: ["teams", filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<Team>>(
        `/api/teams${buildTeamParams(filters)}`
      ),
  });
}

export function useTeam(teamId: string | undefined) {
  return useQuery<{ data: Team }>({
    queryKey: ["teams", teamId],
    queryFn: () => fetchJson<{ data: Team }>(`/api/teams/${teamId}`),
    enabled: !!teamId,
  });
}

export function useMyTeams() {
  const user = useAuthStore((s) => s.user);
  return useQuery<PaginatedResponse<Team>>({
    queryKey: ["teams", "mine", user?.id],
    queryFn: () =>
      fetchJson<PaginatedResponse<Team>>(
        `/api/teams${buildTeamParams({ userId: user?.id, pageSize: 50 })}`
      ),
    enabled: !!user?.id,
  });
}

export function useHackathonTeams(hackathonId: string | undefined) {
  return useQuery<PaginatedResponse<Team>>({
    queryKey: ["teams", "hackathon", hackathonId],
    queryFn: () =>
      fetchJson<PaginatedResponse<Team>>(
        `/api/teams${buildTeamParams({ hackathonId, pageSize: 50 })}`
      ),
    enabled: !!hackathonId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      hackathon_id: string;
      track?: unknown;
      looking_for_roles?: string[];
      max_size?: number;
      join_password?: string;
      role?: string;
    }) => {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create team");
      }
      return res.json() as Promise<{ data: Team }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Record<string, unknown> & { id: string }) => {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update team");
      }
      return res.json() as Promise<{ data: Team }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["teams", variables.id] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete team");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      user_id,
      role,
      password,
    }: {
      teamId: string;
      user_id?: string;
      role?: string;
      password?: string;
    }) => {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, role, password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to join team");
      }
      return res.json() as Promise<{ data: Team }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({
        queryKey: ["teams", variables.teamId],
      });
    },
  });
}

export function useLeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId,
      user_id,
    }: {
      teamId: string;
      user_id?: string;
    }) => {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to leave team");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({
        queryKey: ["teams", variables.teamId],
      });
    },
  });
}
