import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { BlogPost, PaginatedResponse } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

interface BlogFilters {
  search?: string;
  category?: string;
  tag?: string;
  authorId?: string;
  status?: string;
  sortBy?: "newest" | "oldest" | "popular";
  page?: number;
  pageSize?: number;
}

function buildBlogParams(filters?: BlogFilters): string {
  const params = new URLSearchParams();
  if (!filters) return "";
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.authorId) params.set("authorId", filters.authorId);
  if (filters.status) params.set("status", filters.status);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const str = params.toString();
  return str ? `?${str}` : "";
}

export function useBlogPosts(filters?: BlogFilters) {
  return useQuery<PaginatedResponse<BlogPost>>({
    queryKey: ["blog", filters],
    queryFn: () =>
      fetchJson<PaginatedResponse<BlogPost>>(
        `/api/blog${buildBlogParams(filters)}`
      ),
  });
}

export function useBlogPost(slug: string | undefined) {
  return useQuery<{ data: BlogPost }>({
    queryKey: ["blog", slug],
    queryFn: () => fetchJson<{ data: BlogPost }>(`/api/blog/${slug}`),
    enabled: !!slug,
  });
}

export function useMyBlogPosts(page?: number) {
  const user = useAuthStore((s) => s.user);
  return useQuery<PaginatedResponse<BlogPost>>({
    queryKey: ["blog", "mine", user?.id, page],
    queryFn: () =>
      fetchJson<PaginatedResponse<BlogPost>>(
        `/api/blog${buildBlogParams({ authorId: user?.id, status: "all", page, pageSize: 50 })}`
      ),
    enabled: !!user?.id,
  });
}

export function useCreateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create blog post");
      }
      return res.json() as Promise<{ data: BlogPost }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
  });
}

export function useUpdateBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      ...updates
    }: Record<string, unknown> & { slug: string }) => {
      const res = await fetch(`/api/blog/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update blog post");
      }
      return res.json() as Promise<{ data: BlogPost }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
      queryClient.invalidateQueries({ queryKey: ["blog", variables.slug] });
    },
  });
}

export function useDeleteBlogPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slug: string) => {
      const res = await fetch(`/api/blog/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete blog post");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog"] });
    },
  });
}
