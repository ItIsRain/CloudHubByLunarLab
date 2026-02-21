import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Submission, PaginatedResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

interface SubmissionFilters {
  hackathonId?: string;
  teamId?: string;
  userId?: string;
  status?: string;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

function buildParams(filters?: SubmissionFilters): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.hackathonId) params.set("hackathonId", filters.hackathonId);
  if (filters.teamId) params.set("teamId", filters.teamId);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.status) params.set("status", filters.status);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useSubmissions(filters?: SubmissionFilters) {
  return useQuery<PaginatedResponse<Submission>>({
    queryKey: ["submissions", filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<Submission>>(
        `/api/submissions${buildParams(filters)}`
      ),
  });
}

export function useSubmission(id: string | undefined) {
  return useQuery<{ data: Submission }>({
    queryKey: ["submissions", id],
    queryFn: () => fetchJson<{ data: Submission }>(`/api/submissions/${id}`),
    enabled: !!id,
  });
}

export function useMySubmissions() {
  const user = useAuthStore((s) => s.user);
  return useQuery<PaginatedResponse<Submission>>({
    queryKey: ["submissions", "mine", user?.id],
    queryFn: () =>
      fetchJson<PaginatedResponse<Submission>>(
        `/api/submissions${buildParams({ userId: user?.id, pageSize: 50 })}`
      ),
    enabled: !!user?.id,
  });
}

export function useHackathonSubmissions(hackathonId: string | undefined) {
  return useQuery<PaginatedResponse<Submission>>({
    queryKey: ["submissions", "hackathon", hackathonId],
    queryFn: () =>
      fetchJson<PaginatedResponse<Submission>>(
        `/api/submissions${buildParams({ hackathonId, pageSize: 100 })}`
      ),
    enabled: !!hackathonId,
  });
}

export function useCreateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create submission");
      }
      return res.json() as Promise<{ data: Submission }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useUpdateSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Record<string, unknown> & { id: string }) => {
      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update submission");
      }
      return res.json() as Promise<{ data: Submission }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({
        queryKey: ["submissions", variables.id],
      });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete submission");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}

export function useSubmitScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      ...scoreData
    }: {
      submissionId: string;
      criteria?: unknown[];
      totalScore: number;
      overallFeedback?: string;
    }) => {
      const res = await fetch(`/api/submissions/${submissionId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoreData),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to submit score");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({
        queryKey: ["submissions", variables.submissionId],
      });
    },
  });
}

export function useUpdateScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      submissionId,
      ...scoreData
    }: {
      submissionId: string;
      criteria?: unknown[];
      totalScore?: number;
      overallFeedback?: string;
    }) => {
      const res = await fetch(`/api/submissions/${submissionId}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scoreData),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update score");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["submissions"] });
      queryClient.invalidateQueries({
        queryKey: ["submissions", variables.submissionId],
      });
    },
  });
}
