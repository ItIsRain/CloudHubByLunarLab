import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Notification, PaginatedResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

interface NotificationFilters {
  type?: string;
  unread?: boolean;
  page?: number;
  pageSize?: number;
}

function buildNotificationParams(filters?: NotificationFilters): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.type) params.set("type", filters.type);
  if (filters.unread) params.set("unread", "true");
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useNotifications(filters?: NotificationFilters) {
  const user = useAuthStore((s) => s.user);
  return useQuery<PaginatedResponse<Notification>>({
    queryKey: ["notifications", user?.id, filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<Notification>>(
        `/api/notifications${buildNotificationParams(filters)}`
      ),
    enabled: !!user?.id,
  });
}

export function useUnreadNotificationCount() {
  const user = useAuthStore((s) => s.user);
  return useQuery<{ count: number }>({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: () => fetchJson<{ count: number }>("/api/notifications/unread-count"),
    enabled: !!user?.id,
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/read", { method: "PATCH" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to mark all as read");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useToggleNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_read,
    }: {
      id: string;
      is_read: boolean;
    }) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to toggle notification");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete notification");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      user_id?: string;
      type: string;
      title: string;
      message: string;
      link?: string;
    }) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create notification");
      }
      return res.json() as Promise<{ data: Notification }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
