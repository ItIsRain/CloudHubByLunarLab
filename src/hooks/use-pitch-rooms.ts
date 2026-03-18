import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ── Types ────────────────────────────────────────────────

export interface PitchRoomJudge {
  id: string;
  room_id: string;
  reviewer_id: string;
  assigned_at: string;
  reviewer: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
}

export interface PitchRoomSlot {
  id: string;
  room_id: string;
  registration_id: string;
  slot_order: number;
  scheduled_time: string | null;
  duration_minutes: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  created_at: string;
  registration: {
    id: string;
    user_id: string;
    applicant: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    } | null;
  } | null;
}

export interface PitchRoom {
  id: string;
  phase_id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
  judges: PitchRoomJudge[];
  slots: PitchRoomSlot[];
}

// ── Query keys ───────────────────────────────────────────

function roomsKey(hackathonId: string, phaseId: string) {
  return ["pitch-rooms", hackathonId, phaseId] as const;
}

function baseUrl(hackathonId: string, phaseId: string) {
  return `/api/hackathons/${hackathonId}/phases/${phaseId}/rooms`;
}

// ── GET — List all rooms for a phase ─────────────────────

export function usePitchRooms(
  hackathonId: string | undefined,
  phaseId: string | undefined
) {
  return useQuery<{ data: PitchRoom[] }>({
    queryKey: roomsKey(hackathonId!, phaseId!),
    queryFn: () =>
      fetchJson<{ data: PitchRoom[] }>(baseUrl(hackathonId!, phaseId!)),
    enabled: !!hackathonId && !!phaseId,
  });
}

// ── POST — Create a room ────────────────────────────────

interface CreateRoomPayload {
  name: string;
  description?: string;
  sortOrder?: number;
}

export function useCreatePitchRoom(
  hackathonId: string,
  phaseId: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRoomPayload) => {
      const res = await fetch(baseUrl(hackathonId, phaseId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create room");
      }
      return res.json() as Promise<{ data: PitchRoom }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roomsKey(hackathonId, phaseId) });
    },
  });
}

// ── PATCH — Multi-action update ─────────────────────────

export type PatchAction =
  | { action: "update_room"; roomId: string; name?: string; description?: string; status?: string; sortOrder?: number }
  | { action: "assign_judges"; roomId: string; reviewerIds: string[] }
  | { action: "remove_judge"; roomId: string; reviewerId: string }
  | { action: "assign_slots"; roomId: string; slots: Array<{ registrationId: string; slotOrder?: number; scheduledTime?: string; durationMinutes?: number }> }
  | { action: "remove_slot"; roomId: string; registrationId: string }
  | { action: "update_slot_status"; roomId: string; registrationId: string; status: "pending" | "in_progress" | "completed" | "skipped" };

export function useUpdatePitchRoom(
  hackathonId: string,
  phaseId: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PatchAction) => {
      const res = await fetch(baseUrl(hackathonId, phaseId), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update room");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roomsKey(hackathonId, phaseId) });
    },
  });
}

// ── DELETE — Delete a room ──────────────────────────────

export function useDeletePitchRoom(
  hackathonId: string,
  phaseId: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      const res = await fetch(
        `${baseUrl(hackathonId, phaseId)}?roomId=${roomId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete room");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: roomsKey(hackathonId, phaseId) });
    },
  });
}
