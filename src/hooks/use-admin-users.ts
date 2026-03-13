import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User, UserRole } from "@/lib/types";

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

export interface AdminUsersFilters {
  search?: string;
  role?: UserRole;
  status?: "active" | "suspended" | "banned";
  page?: number;
  pageSize?: number;
}

interface AdminUsersResponse {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UpdateUserPayload {
  userId: string;
  roles?: string[];
  status?: "active" | "suspended" | "banned";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAdminUsersParams(filters?: AdminUsersFilters): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.search) params.set("search", filters.search);
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const str = params.toString();
  return str ? `?${str}` : "";
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAdminUsers(filters?: AdminUsersFilters) {
  return useQuery<AdminUsersResponse>({
    queryKey: ["admin-users", filters],
    queryFn: () =>
      fetchJson<AdminUsersResponse>(
        `/api/admin/users${buildAdminUsersParams(filters)}`
      ),
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ...updates }: UpdateUserPayload) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update user");
      }
      return res.json() as Promise<{ data: User }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
