import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Testimonial } from "@/lib/types";


export function useTestimonials(limit = 10) {
  return useQuery<{ data: Testimonial[] }>({
    queryKey: ["testimonials", limit],
    queryFn: () =>
      fetchJson<{ data: Testimonial[] }>(`/api/testimonials?limit=${limit}`),
  });
}

export function useCreateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      quote: string;
      role: string;
      company: string;
      highlightStat?: string;
      rating?: number;
    }) => {
      const res = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to submit testimonial");
      }
      return res.json() as Promise<{ data: Testimonial }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
  });
}
