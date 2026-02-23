import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

interface Bookmark {
  id: string;
  user_id: string;
  entity_type: "event" | "hackathon";
  entity_id: string;
  created_at: string;
}

interface ToggleResult {
  bookmarked: boolean;
  entityType: "event" | "hackathon";
  entityId: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/** Fetch all bookmark records for the current user */
export function useBookmarks(type?: "event" | "hackathon") {
  const user = useAuthStore((s) => s.user);
  const typeParam = type ? `?type=${type}` : "";

  return useQuery<{ data: Bookmark[] }>({
    queryKey: ["bookmarks", type ?? "all", user?.id],
    queryFn: () => fetchJson<{ data: Bookmark[] }>(`/api/bookmarks${typeParam}`),
    enabled: !!user?.id,
  });
}

/** Returns a Set of bookmarked entity IDs for quick O(1) lookups */
export function useBookmarkIds(type?: "event" | "hackathon") {
  const { data, isLoading } = useBookmarks(type);

  const bookmarkIds = useMemo(
    () => new Set((data?.data || []).map((b) => b.entity_id)),
    [data]
  );

  return { bookmarkIds, isLoading };
}

/** Toggle bookmark mutation */
export function useToggleBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      entityType: "event" | "hackathon";
      entityId: string;
    }) => {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to toggle bookmark");
      }
      return res.json() as Promise<{ data: ToggleResult }>;
    },
    onSuccess: (result) => {
      const { bookmarked } = result.data;
      toast.success(bookmarked ? "Bookmarked!" : "Removed from bookmarks");
      // Invalidate all bookmark queries so UI updates everywhere
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
    onError: (error: Error) => {
      if (error.message.includes("Not authenticated")) {
        toast.error("Please sign in to bookmark");
      } else {
        toast.error("Failed to update bookmark");
      }
    },
  });
}

/** Convenience: returns the bookmarked entity IDs for the given type */
export function useBookmarkedEntityIds(type: "event" | "hackathon") {
  const { data, isLoading } = useBookmarks(type);

  const ids = useMemo(
    () => (data?.data || []).map((b) => b.entity_id),
    [data]
  );

  return { ids, isLoading };
}
