import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import type {
  MyMentorship,
  HackathonMentor,
  MentorAvailabilityBlock,
  MentorBookableSlot,
  MentorSession,
} from "@/lib/types";

async function postJson<T>(url: string, payload: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Request failed");
  }
  return res.json();
}

async function del(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Request failed");
  }
}

// ── Discovery / roster ───────────────────────────────────

/** Hackathons where the current user is a mentor (drives the entry button). */
export function useMyMentorships() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<{ data: MyMentorship[] }>({
    queryKey: ["my-mentorships"],
    queryFn: () => fetchJson<{ data: MyMentorship[] }>("/api/hackathons/my-mentorships"),
    enabled: isAuthenticated,
  });
}

/** The hackathon's mentor roster (organizer sees all + emails; others accepted-only). */
export function useHackathonMentors(hackathonId: string | undefined) {
  return useQuery<{ data: HackathonMentor[] }>({
    queryKey: ["hackathon-mentors", hackathonId],
    queryFn: () =>
      fetchJson<{ data: HackathonMentor[] }>(`/api/hackathons/${hackathonId}/mentors`),
    enabled: !!hackathonId,
  });
}

export function useInviteMentor(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; name?: string; expertise?: string[] }) =>
      postJson(`/api/hackathons/${hackathonId}/mentors/invite`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hackathon-mentors", hackathonId] }),
  });
}

export function useRemoveMentor(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mentorId: string) =>
      del(`/api/hackathons/${hackathonId}/mentors/${mentorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hackathon-mentors", hackathonId] }),
  });
}

/** Update a roster row (mentor self: defaults/bio/expertise; organizer: name/etc). */
export function useUpdateMentor(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mentorId,
      ...payload
    }: {
      mentorId: string;
      name?: string;
      bio?: string;
      expertise?: string[];
      defaultMeetingUrl?: string | null;
      defaultMeetingPhone?: string | null;
    }) => postJson(`/api/hackathons/${hackathonId}/mentors/${mentorId}`, payload, "PATCH"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hackathon-mentors", hackathonId] });
      qc.invalidateQueries({ queryKey: ["my-mentorships"] });
    },
  });
}

// ── Invitation accept ────────────────────────────────────

export function useMentorInvitation(hackathonId: string, token: string | null) {
  return useQuery<{ data: { id: string; name: string; status: string; hackathonName: string } }>({
    queryKey: ["mentor-invitation", hackathonId, token],
    queryFn: () =>
      fetchJson(`/api/hackathons/${hackathonId}/mentors/accept?token=${token}`),
    enabled: !!hackathonId && !!token,
    retry: false,
    staleTime: Infinity,
  });
}

export function useAcceptMentorInvite(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { token: string; action?: "accept" | "decline" }) =>
      postJson(`/api/hackathons/${hackathonId}/mentors/accept`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-mentorships"] }),
  });
}

// ── Availability (date-based blocks) ─────────────────────

export function useMentorAvailabilityBlocks(
  hackathonId: string | undefined,
  mentorRosterId?: string
) {
  return useQuery<{ data: MentorAvailabilityBlock[] }>({
    queryKey: ["mentor-avail-blocks", hackathonId, mentorRosterId ?? "me"],
    queryFn: () => {
      const qs = mentorRosterId ? `?mentorId=${mentorRosterId}` : "";
      return fetchJson<{ data: MentorAvailabilityBlock[] }>(
        `/api/hackathons/${hackathonId}/mentors/availability${qs}`
      );
    },
    enabled: !!hackathonId,
  });
}

export function useAddMentorAvailabilityBlock(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      date: string;
      startTime: string;
      endTime: string;
      slotDurationMinutes: number;
      timezone: string;
    }) => postJson(`/api/hackathons/${hackathonId}/mentors/availability`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor-avail-blocks", hackathonId] });
      qc.invalidateQueries({ queryKey: ["mentor-bookable-slots"] });
    },
  });
}

export function useDeleteMentorAvailabilityBlock(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (blockId: string) =>
      del(`/api/hackathons/${hackathonId}/mentors/availability/${blockId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor-avail-blocks", hackathonId] });
      qc.invalidateQueries({ queryKey: ["mentor-bookable-slots"] });
    },
  });
}

// ── Bookable slots + bookings ────────────────────────────

export function useMentorBookableSlots(
  hackathonId: string | undefined,
  mentorRosterId: string | undefined,
  enabled = true
) {
  return useQuery<{ data: MentorBookableSlot[] }>({
    queryKey: ["mentor-bookable-slots", hackathonId, mentorRosterId],
    queryFn: () =>
      fetchJson<{ data: MentorBookableSlot[] }>(
        `/api/hackathons/${hackathonId}/mentors/${mentorRosterId}/slots`
      ),
    enabled: !!hackathonId && !!mentorRosterId && enabled,
  });
}

/** Bookings where the current user is the mentor (manage view). */
export function useMentorBookings(hackathonId: string | undefined) {
  return useQuery<{ data: MentorSession[] }>({
    queryKey: ["mentor-bookings", hackathonId],
    queryFn: () =>
      fetchJson<{ data: MentorSession[] }>(
        `/api/hackathons/${hackathonId}/mentors/bookings?role=mentor`
      ),
    enabled: !!hackathonId,
  });
}

/** The current participant's own bookings for this hackathon. */
export function useMyMentorBookings(hackathonId: string | undefined) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery<{ data: MentorSession[] }>({
    queryKey: ["my-mentor-bookings", hackathonId, userId],
    queryFn: () =>
      fetchJson<{ data: MentorSession[] }>(
        `/api/hackathons/${hackathonId}/mentors/bookings?role=mentee`
      ),
    enabled: !!hackathonId && !!userId,
  });
}

export function useRequestMentorBooking(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { mentorId: string; blockId: string; start: string; topic?: string }) =>
      postJson(`/api/hackathons/${hackathonId}/mentors/bookings`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-mentor-bookings", hackathonId] });
      qc.invalidateQueries({ queryKey: ["mentor-bookable-slots", hackathonId] });
    },
  });
}

export function useUpdateMentorBooking(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      ...payload
    }: {
      sessionId: string;
      status?: string;
      meetingUrl?: string | null;
      meetingPhone?: string | null;
      notes?: string | null;
      cancellationReason?: string;
    }) =>
      postJson(
        `/api/hackathons/${hackathonId}/mentors/bookings/${sessionId}`,
        payload,
        "PATCH"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mentor-bookings", hackathonId] });
      qc.invalidateQueries({ queryKey: ["my-mentor-bookings", hackathonId] });
      qc.invalidateQueries({ queryKey: ["mentor-bookable-slots", hackathonId] });
    },
  });
}
