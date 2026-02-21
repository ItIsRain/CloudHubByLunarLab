import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Event, EventFilters, PaginatedResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function buildEventParams(filters?: EventFilters & { page?: number; pageSize?: number; organizerId?: string; featured?: boolean; ids?: string[] }): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.search) params.set("search", filters.search);
  if (filters.category?.length) params.set("category", filters.category.join(","));
  if (filters.type?.length) params.set("type", filters.type.join(","));
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  if (filters.organizerId) params.set("organizerId", filters.organizerId);
  if (filters.featured) params.set("featured", "true");
  if (filters.ids?.length) params.set("ids", filters.ids.join(","));
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useEvents(filters?: EventFilters & { page?: number; pageSize?: number }) {
  return useQuery<PaginatedResponse<Event>>({
    queryKey: ["events", filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<Event>>(`/api/events${buildEventParams(filters)}`),
  });
}

export function useEvent(id: string | undefined) {
  return useQuery<{ data: Event }>({
    queryKey: ["events", id],
    queryFn: () => fetchJson<{ data: Event }>(`/api/events/${id}`),
    enabled: !!id,
  });
}

export function useMyEvents(page?: number) {
  const user = useAuthStore((s) => s.user);
  return useQuery<PaginatedResponse<Event>>({
    queryKey: ["events", "mine", user?.id, page],
    queryFn: () =>
      fetchJson<PaginatedResponse<Event>>(
        `/api/events${buildEventParams({ organizerId: user?.id, page, pageSize: 50 })}`
      ),
    enabled: !!user?.id,
  });
}

export function useFeaturedEvents() {
  return useQuery<PaginatedResponse<Event>>({
    queryKey: ["events", "featured"],
    queryFn: () =>
      fetchJson<PaginatedResponse<Event>>(
        `/api/events${buildEventParams({ featured: true, pageSize: 6 })}`
      ),
  });
}

export function useUpcomingEvents(pageSize = 4) {
  return useQuery<PaginatedResponse<Event>>({
    queryKey: ["events", "upcoming", pageSize],
    queryFn: () =>
      fetchJson<PaginatedResponse<Event>>(
        `/api/events${buildEventParams({ sortBy: "date", pageSize })}`
      ),
  });
}

export function useEventsByIds(ids: string[]) {
  return useQuery<PaginatedResponse<Event>>({
    queryKey: ["events", "byIds", ids],
    queryFn: () =>
      fetchJson<PaginatedResponse<Event>>(
        `/api/events${buildEventParams({ ids, pageSize: ids.length || 1 })}`
      ),
    enabled: ids.length > 0,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create event");
      }
      return res.json() as Promise<{ data: Event }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Record<string, unknown> & { id: string }) => {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update event");
      }
      return res.json() as Promise<{ data: Event }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["events", variables.id] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
