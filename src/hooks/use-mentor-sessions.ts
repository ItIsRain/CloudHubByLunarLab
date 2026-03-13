import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MentorAvailability, MentorSession } from "@/lib/types";
import { useAuthStore } from "@/store/auth-store";

// =====================================================
// Availability hooks
// =====================================================

export function useMentorAvailability(mentorId: string | undefined, hackathonId?: string) {
  const params = new URLSearchParams();
  if (mentorId) params.set("mentor_id", mentorId);
  if (hackathonId) params.set("hackathon_id", hackathonId);
  const qs = params.toString();

  return useQuery<{ data: MentorAvailability[] }>({
    queryKey: ["mentor-availability", mentorId, hackathonId],
    queryFn: () =>
      fetchJson<{ data: MentorAvailability[] }>(
        `/api/mentor/availability${qs ? `?${qs}` : ""}`
      ),
    enabled: !!mentorId,
  });
}

export function useSetAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      hackathon_id?: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      timezone?: string;
      is_active?: boolean;
    }) => {
      const res = await fetch("/api/mentor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create availability slot");
      }
      return res.json() as Promise<{ data: MentorAvailability }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-availability"] });
    },
  });
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (slotId: string) => {
      const res = await fetch(`/api/mentor/availability/${slotId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete availability slot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-availability"] });
    },
  });
}

// =====================================================
// Session hooks
// =====================================================

export function useMyMentorSessions(filters?: {
  hackathon_id?: string;
  status?: string;
  role?: "mentor" | "mentee";
}) {
  const user = useAuthStore((s) => s.user);
  const params = new URLSearchParams();
  if (filters?.hackathon_id) params.set("hackathon_id", filters.hackathon_id);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.role) params.set("role", filters.role);
  const qs = params.toString();

  return useQuery<{ data: MentorSession[] }>({
    queryKey: ["mentor-sessions", user?.id, filters],
    queryFn: () =>
      fetchJson<{ data: MentorSession[] }>(
        `/api/mentor/sessions${qs ? `?${qs}` : ""}`
      ),
    enabled: !!user?.id,
  });
}

export function useBookSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      mentor_id: string;
      hackathon_id?: string;
      team_id?: string;
      title: string;
      description?: string;
      session_date: string;
      duration_minutes?: number;
      platform?: string;
      meeting_url?: string;
    }) => {
      const res = await fetch("/api/mentor/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to book session");
      }
      return res.json() as Promise<{ data: MentorSession }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      ...updates
    }: {
      sessionId: string;
      status?: string;
      cancellation_reason?: string;
      notes?: string;
      meeting_url?: string;
      mentor_feedback_rating?: number;
      mentor_feedback_comment?: string;
      mentee_feedback_rating?: number;
      mentee_feedback_comment?: string;
    }) => {
      const res = await fetch(`/api/mentor/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update session");
      }
      return res.json() as Promise<{ data: MentorSession }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-sessions"] });
    },
  });
}
