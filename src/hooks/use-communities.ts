import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Community, CommunityMember, PaginatedResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

interface CommunityFilters {
  search?: string;
  tags?: string[];
  organizerId?: string;
  sortBy?: "newest" | "members" | "name";
  page?: number;
  pageSize?: number;
}

function buildCommunityParams(filters?: CommunityFilters): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.search) params.set("search", filters.search);
  if (filters.tags?.length) params.set("tags", filters.tags.join(","));
  if (filters.organizerId) params.set("organizerId", filters.organizerId);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useCommunities(filters?: CommunityFilters) {
  return useQuery<PaginatedResponse<Community>>({
    queryKey: ["communities", filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<Community>>(
        `/api/communities${buildCommunityParams(filters)}`
      ),
  });
}

export function useCommunity(idOrSlug: string | undefined) {
  return useQuery<{ data: Community }>({
    queryKey: ["communities", idOrSlug],
    queryFn: () =>
      fetchJson<{ data: Community }>(`/api/communities/${idOrSlug}`),
    enabled: !!idOrSlug,
  });
}

export function useMyCommunities(page?: number) {
  const user = useAuthStore((s) => s.user);
  return useQuery<PaginatedResponse<Community>>({
    queryKey: ["communities", "mine", user?.id, page],
    queryFn: () =>
      fetchJson<PaginatedResponse<Community>>(
        `/api/communities${buildCommunityParams({ organizerId: user?.id, page, pageSize: 50 })}`
      ),
    enabled: !!user?.id,
  });
}

export function useCommunityMembers(
  communityId: string | undefined,
  options?: { page?: number; pageSize?: number; role?: string }
) {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.pageSize) params.set("pageSize", String(options.pageSize));
  if (options?.role) params.set("role", options.role);
  const qs = params.toString();

  return useQuery<PaginatedResponse<CommunityMember>>({
    queryKey: ["communities", communityId, "members", options],
    queryFn: () =>
      fetchJson<PaginatedResponse<CommunityMember>>(
        `/api/communities/${communityId}/members${qs ? `?${qs}` : ""}`
      ),
    enabled: !!communityId,
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create community");
      }
      return res.json() as Promise<{ data: Community }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

export function useUpdateCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Record<string, unknown> & { id: string }) => {
      const res = await fetch(`/api/communities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update community");
      }
      return res.json() as Promise<{ data: Community }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      queryClient.invalidateQueries({
        queryKey: ["communities", variables.id],
      });
    },
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const res = await fetch(`/api/communities/${communityId}/join`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to join community");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const res = await fetch(`/api/communities/${communityId}/leave`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to leave community");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
    },
  });
}
