import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";
import { toast } from "sonner";
import type { Report, ReportType, ReportStatus } from "@/lib/types";

// =====================================================
// Query key factory
// =====================================================

const adminReportsKeys = {
  all: ["admin-reports"] as const,
  list: (filters?: AdminReportsFilters) =>
    [...adminReportsKeys.all, "list", filters ?? {}] as const,
};

// =====================================================
// Types
// =====================================================

export interface AdminReportsFilters {
  type?: ReportType;
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
}

interface AdminReportsResponse {
  data: Report[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UpdateReportPayload {
  reportId: string;
  status?: ReportStatus;
  resolutionNote?: string;
}

// =====================================================
// Hooks
// =====================================================

/** Fetch paginated admin reports with optional filters */
export function useAdminReports(filters?: AdminReportsFilters) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));

  const qs = params.toString();
  const url = `/api/admin/reports${qs ? `?${qs}` : ""}`;

  return useQuery<AdminReportsResponse>({
    queryKey: adminReportsKeys.list(filters),
    queryFn: () => fetchJson<AdminReportsResponse>(url),
    staleTime: 30 * 1000,
    retry: false,
  });
}

/** Update a report (status, resolution note) */
export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reportId, ...body }: UpdateReportPayload) => {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update report");
      }
      return res.json() as Promise<{ data: Report }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminReportsKeys.all });
      toast.success("Report updated");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

/** Delete a report */
export function useDeleteReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete report");
      }
      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminReportsKeys.all });
      toast.success("Report deleted");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
