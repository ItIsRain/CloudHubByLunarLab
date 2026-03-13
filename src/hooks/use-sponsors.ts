"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetch-json";

interface Sponsor {
  id: string;
  name: string;
  slug: string;
  logo: string;
  website?: string;
  description?: string;
  tier: string;
  contactEmail?: string;
  contactName?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SponsorsResponse {
  data: Sponsor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export function useSponsors(filters?: { tier?: string; search?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters?.tier) params.set("tier", filters.tier);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.page) params.set("page", String(filters.page));

  const qs = params.toString();
  return useQuery({
    queryKey: ["sponsors", filters],
    queryFn: () => fetchJson<SponsorsResponse>(`/api/sponsors${qs ? `?${qs}` : ""}`),
  });
}

export function useSponsor(idOrSlug: string | undefined) {
  return useQuery({
    queryKey: ["sponsor", idOrSlug],
    queryFn: () => fetchJson<{ sponsor: Sponsor }>(`/api/sponsors/${idOrSlug}`),
    enabled: !!idOrSlug,
  });
}

export function useCreateSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      logo: string;
      website?: string;
      description?: string;
      tier?: string;
      contactEmail?: string;
      contactName?: string;
    }) => {
      const res = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create sponsor");
      return json.sponsor as Sponsor;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
    },
  });
}

export function useUpdateSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Record<string, unknown>) => {
      const res = await fetch(`/api/sponsors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update sponsor");
      return json.sponsor as Sponsor;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
      qc.invalidateQueries({ queryKey: ["sponsor", vars.id] });
    },
  });
}

export function useDeleteSponsor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sponsors/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete sponsor");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sponsors"] });
    },
  });
}
