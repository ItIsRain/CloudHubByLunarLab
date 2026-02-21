import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Hackathon, HackathonFilters, PaginatedResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function buildHackathonParams(filters?: HackathonFilters & { page?: number; pageSize?: number; organizerId?: string; featured?: boolean; ids?: string[] }): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.search) params.set("search", filters.search);
  if (filters.category?.length) params.set("category", filters.category.join(","));
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.organizerId) params.set("organizerId", filters.organizerId);
  if (filters.featured) params.set("featured", "true");
  if (filters.ids?.length) params.set("ids", filters.ids.join(","));
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useHackathons(filters?: HackathonFilters & { page?: number; pageSize?: number }) {
  return useQuery<PaginatedResponse<Hackathon>>({
    queryKey: ["hackathons", filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<Hackathon>>(`/api/hackathons${buildHackathonParams(filters)}`),
  });
}

export function useHackathon(id: string | undefined) {
  return useQuery<{ data: Hackathon }>({
    queryKey: ["hackathons", id],
    queryFn: () => fetchJson<{ data: Hackathon }>(`/api/hackathons/${id}`),
    enabled: !!id,
  });
}

export function useMyHackathons(page?: number) {
  const user = useAuthStore((s) => s.user);
  return useQuery<PaginatedResponse<Hackathon>>({
    queryKey: ["hackathons", "mine", user?.id, page],
    queryFn: () =>
      fetchJson<PaginatedResponse<Hackathon>>(
        `/api/hackathons${buildHackathonParams({ organizerId: user?.id, page, pageSize: 50 })}`
      ),
    enabled: !!user?.id,
  });
}

export function useActiveHackathons() {
  return useQuery<PaginatedResponse<Hackathon>>({
    queryKey: ["hackathons", "active"],
    queryFn: () =>
      fetchJson<PaginatedResponse<Hackathon>>(
        `/api/hackathons${buildHackathonParams({
          status: ["published", "registration-open", "hacking", "submission", "judging"],
          pageSize: 6,
        })}`
      ),
  });
}

export function useFeaturedHackathons() {
  return useQuery<PaginatedResponse<Hackathon>>({
    queryKey: ["hackathons", "featured"],
    queryFn: () =>
      fetchJson<PaginatedResponse<Hackathon>>(
        `/api/hackathons${buildHackathonParams({ featured: true, pageSize: 6 })}`
      ),
  });
}

export function useHackathonsByIds(ids: string[]) {
  return useQuery<PaginatedResponse<Hackathon>>({
    queryKey: ["hackathons", "byIds", ids],
    queryFn: () =>
      fetchJson<PaginatedResponse<Hackathon>>(
        `/api/hackathons${buildHackathonParams({ ids, pageSize: ids.length || 1 })}`
      ),
    enabled: ids.length > 0,
  });
}

export function useCreateHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/hackathons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create hackathon");
      }
      return res.json() as Promise<{ data: Hackathon }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
    },
  });
}

export function useUpdateHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Record<string, unknown> & { id: string }) => {
      const res = await fetch(`/api/hackathons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update hackathon");
      }
      return res.json() as Promise<{ data: Hackathon }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
      queryClient.invalidateQueries({ queryKey: ["hackathons", variables.id] });
    },
  });
}

export function useDeleteHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hackathons/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete hackathon");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
    },
  });
}
