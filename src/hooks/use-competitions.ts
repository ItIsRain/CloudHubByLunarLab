import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CompetitionForm,
  CompetitionApplication,
  ScreeningRule,
  CampusQuota,
} from "@/lib/types";

// ── Competition Forms ───────────────────────────────────

export function useCompetitionForms(mine = false) {
  return useQuery<{ data: CompetitionForm[] }>({
    queryKey: ["competitions", mine ? "mine" : "all"],
    queryFn: () =>
      fetchJson<{ data: CompetitionForm[] }>(
        `/api/competitions${mine ? "?mine=true" : ""}`
      ),
  });
}

export function useCompetitionForm(formId: string | undefined) {
  return useQuery<{ data: CompetitionForm }>({
    queryKey: ["competitions", formId],
    queryFn: () =>
      fetchJson<{ data: CompetitionForm }>(`/api/competitions/${formId}`),
    enabled: !!formId,
  });
}

export function useCreateCompetitionForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create form");
      }
      return res.json() as Promise<{ data: CompetitionForm }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

export function useUpdateCompetitionForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      ...updates
    }: Record<string, unknown> & { formId: string }) => {
      const res = await fetch(`/api/competitions/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update form");
      }
      return res.json() as Promise<{ data: CompetitionForm }>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      qc.invalidateQueries({ queryKey: ["competitions", variables.formId] });
    },
  });
}

export function useDeleteCompetitionForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formId: string) => {
      const res = await fetch(`/api/competitions/${formId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete form");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

// ── Applications ────────────────────────────────────────

interface ApplicationFilters {
  status?: string;
  campus?: string;
  sector?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface ApplicationsResponse {
  data: CompetitionApplication[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useApplications(formId: string | undefined, filters?: ApplicationFilters) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.campus) params.set("campus", filters.campus);
  if (filters?.sector) params.set("sector", filters.sector);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));
  if (filters?.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();

  return useQuery<ApplicationsResponse>({
    queryKey: ["applications", formId, filters],
    queryFn: () =>
      fetchJson<ApplicationsResponse>(
        `/api/competitions/${formId}/applications${qs ? `?${qs}` : ""}`
      ),
    enabled: !!formId,
  });
}

export function useApplication(formId: string | undefined, applicationId: string | undefined) {
  return useQuery<{ data: CompetitionApplication }>({
    queryKey: ["applications", formId, applicationId],
    queryFn: () =>
      fetchJson<{ data: CompetitionApplication }>(
        `/api/competitions/${formId}/applications/${applicationId}`
      ),
    enabled: !!formId && !!applicationId,
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      ...payload
    }: Record<string, unknown> & { formId: string }) => {
      const res = await fetch(`/api/competitions/${formId}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to submit application");
      }
      return res.json() as Promise<{ data: CompetitionApplication }>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["applications", variables.formId] });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      applicationId,
      ...updates
    }: Record<string, unknown> & { formId: string; applicationId: string }) => {
      const res = await fetch(
        `/api/competitions/${formId}/applications/${applicationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update application");
      }
      return res.json() as Promise<{ data: CompetitionApplication }>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["applications", variables.formId] });
      qc.invalidateQueries({
        queryKey: ["applications", variables.formId, variables.applicationId],
      });
    },
  });
}

// ── My draft/existing application for a form ────────────

/**
 * Fetches the current user's application for a specific form (if any).
 * Returns the first non-withdrawn application.
 */
export function useMyApplication(formId: string | undefined) {
  return useQuery<ApplicationsResponse>({
    queryKey: ["my-application", formId],
    queryFn: () =>
      fetchJson<ApplicationsResponse>(
        `/api/competitions/${formId}/applications`
      ),
    enabled: !!formId,
  });
}

// ── Screening ───────────────────────────────────────────

export function useScreeningDashboard(formId: string | undefined) {
  return useQuery<{ data: Record<string, unknown> }>({
    queryKey: ["screening", formId],
    queryFn: () =>
      fetchJson<{ data: Record<string, unknown> }>(
        `/api/competitions/${formId}/screening`
      ),
    enabled: !!formId,
    refetchInterval: 30_000,
  });
}

export function useRunScreening() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (formId: string) => {
      const res = await fetch(`/api/competitions/${formId}/screening`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Screening failed");
      }
      return res.json() as Promise<{
        data: { screened: number; eligible: number; ineligible: number; flagged: number };
      }>;
    },
    onSuccess: (_data, formId) => {
      qc.invalidateQueries({ queryKey: ["screening", formId] });
      qc.invalidateQueries({ queryKey: ["applications", formId] });
    },
  });
}

// ── Screening Rules ─────────────────────────────────────

export function useScreeningRules(formId: string | undefined) {
  return useQuery<{ data: ScreeningRule[] }>({
    queryKey: ["screening-rules", formId],
    queryFn: () =>
      fetchJson<{ data: ScreeningRule[] }>(
        `/api/competitions/${formId}/rules`
      ),
    enabled: !!formId,
  });
}

export function useCreateScreeningRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      ...payload
    }: Record<string, unknown> & { formId: string }) => {
      const res = await fetch(`/api/competitions/${formId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create rule");
      }
      return res.json() as Promise<{ data: ScreeningRule }>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["screening-rules", variables.formId] });
    },
  });
}

export function useUpdateScreeningRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      ruleId,
      ...updates
    }: Record<string, unknown> & { formId: string; ruleId: string }) => {
      const res = await fetch(`/api/competitions/${formId}/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update rule");
      }
      return res.json() as Promise<{ data: ScreeningRule }>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["screening-rules", variables.formId] });
    },
  });
}

export function useDeleteScreeningRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ formId, ruleId }: { formId: string; ruleId: string }) => {
      const res = await fetch(`/api/competitions/${formId}/rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete rule");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["screening-rules", variables.formId] });
    },
  });
}

// ── Quotas ──────────────────────────────────────────────

export function useCampusQuotas(formId: string | undefined) {
  return useQuery<{ data: CampusQuota[] }>({
    queryKey: ["quotas", formId],
    queryFn: () =>
      fetchJson<{ data: CampusQuota[] }>(`/api/competitions/${formId}/quotas`),
    enabled: !!formId,
  });
}

export function useSetCampusQuotas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      formId,
      quotas,
    }: {
      formId: string;
      quotas: { campus: string; quota: number }[];
    }) => {
      const res = await fetch(`/api/competitions/${formId}/quotas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotas }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to set quotas");
      }
      return res.json() as Promise<{ data: CampusQuota[] }>;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["quotas", variables.formId] });
      qc.invalidateQueries({ queryKey: ["screening", variables.formId] });
    },
  });
}
