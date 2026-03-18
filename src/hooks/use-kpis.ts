import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface CompetitionKPI {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  target_value: number;
  actual_value: number;
  unit: string;
  category: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

export function useKPIs(hackathonId: string | undefined) {
  return useQuery<{ data: CompetitionKPI[] }>({
    queryKey: ["kpis", hackathonId],
    queryFn: () =>
      fetchJson<{ data: CompetitionKPI[] }>(
        `/api/hackathons/${hackathonId}/kpis`
      ),
    enabled: !!hackathonId,
  });
}

export function useCreateKPI(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      kpis:
        | {
            name: string;
            description?: string | null;
            targetValue: number;
            actualValue?: number;
            unit?: string;
            category?: string;
            sortOrder?: number;
          }
        | Array<{
            name: string;
            description?: string | null;
            targetValue: number;
            actualValue?: number;
            unit?: string;
            category?: string;
            sortOrder?: number;
          }>
    ) =>
      mutate<{ data: CompetitionKPI[] }>(
        `/api/hackathons/${hackathonId}/kpis`,
        "POST",
        kpis
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis", hackathonId] });
    },
  });
}

export function useUpdateKPI(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      kpiId,
      ...data
    }: {
      kpiId: string;
      name?: string;
      description?: string | null;
      targetValue?: number;
      actualValue?: number;
      unit?: string;
      category?: string;
      sortOrder?: number;
    }) =>
      mutate<{ data: CompetitionKPI }>(
        `/api/hackathons/${hackathonId}/kpis`,
        "PATCH",
        { kpiId, ...data }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis", hackathonId] });
    },
  });
}

export function useDeleteKPI(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kpiId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/kpis`,
        "DELETE",
        { kpiId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kpis", hackathonId] });
    },
  });
}
