import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EventGuest, EventEmail } from "@/lib/types";


// ─── Guests ───

export function useEventGuests(
  eventId: string | undefined,
  status?: string
) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  const qs = params.toString();
  return useQuery<{ data: EventGuest[] }>({
    queryKey: ["event-guests", eventId, status],
    queryFn: () =>
      fetchJson(`/api/events/${eventId}/guests${qs ? `?${qs}` : ""}`),
    enabled: !!eventId,
  });
}

export function useUpdateGuestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      registrationId,
      status,
    }: {
      eventId: string;
      registrationId: string;
      status: string;
    }) => {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["event-guests", variables.eventId],
      });
    },
  });
}

// ─── Emails ───

export function useEventEmails(eventId: string | undefined) {
  return useQuery<{ data: EventEmail[] }>({
    queryKey: ["event-emails", eventId],
    queryFn: () => fetchJson(`/api/events/${eventId}/emails`),
    enabled: !!eventId,
  });
}

export function useSendEventEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      subject,
      body,
      recipientFilter,
    }: {
      eventId: string;
      subject: string;
      body: string;
      recipientFilter: string;
    }) => {
      const res = await fetch(`/api/events/${eventId}/emails`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, recipientFilter }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to send email");
      }
      return res.json() as Promise<{ sent: number }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["event-emails", variables.eventId],
      });
    },
  });
}
