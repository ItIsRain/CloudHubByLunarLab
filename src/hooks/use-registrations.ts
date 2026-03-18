import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface RegistrationStatus {
  registered: boolean;
  rejected?: boolean;
  isDraft?: boolean;
  registration?: {
    id: string;
    status: string;
    created_at: string;
    form_data?: Record<string, unknown>;
    is_draft?: boolean;
    rsvp_status?: string | null;
  } | null;
}


// ─── Event Registration ───

export function useEventRegistration(eventId: string | undefined) {
  return useQuery<RegistrationStatus>({
    queryKey: ["event-registration", eventId],
    queryFn: () =>
      fetchJson<RegistrationStatus>(`/api/events/${eventId}/register`),
    enabled: !!eventId,
  });
}

export function useRegisterForEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      ticketType,
    }: {
      eventId: string;
      ticketType?: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketType }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["event-registration", variables.eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

export function useCancelEventRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/events/${eventId}/register`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Cancellation failed");
      }
      return res.json();
    },
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({
        queryKey: ["event-registration", eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

// ─── Event Ticket Checkout (paid tickets) ───

export function useCreateTicketCheckout() {
  return useMutation({
    mutationFn: async ({
      eventId,
      ticketId,
    }: {
      eventId: string;
      ticketId: string;
    }) => {
      const res = await fetch(`/api/events/${eventId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Checkout failed");
      }
      return res.json();
    },
  });
}

// ─── Hackathon Registration ───

export function useHackathonRegistration(hackathonId: string | undefined) {
  return useQuery<RegistrationStatus>({
    queryKey: ["hackathon-registration", hackathonId],
    queryFn: () =>
      fetchJson<RegistrationStatus>(
        `/api/hackathons/${hackathonId}/register`
      ),
    enabled: !!hackathonId,
  });
}

export function useRegisterForHackathon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hackathonId,
      formData,
      consent,
    }: {
      hackathonId: string;
      formData?: Record<string, unknown>;
      consent?: { dataProcessing: boolean; marketing: boolean; thirdParty: boolean };
    }) => {
      const res = await fetch(`/api/hackathons/${hackathonId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData, consent }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Registration failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-registration", variables.hackathonId],
      });
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
    },
  });
}

export function useCancelHackathonRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (hackathonId: string) => {
      const res = await fetch(`/api/hackathons/${hackathonId}/register`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Cancellation failed");
      }
      return res.json();
    },
    onSuccess: (_data, hackathonId) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-registration", hackathonId],
      });
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
    },
  });
}

export function useSaveHackathonDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hackathonId,
      formData,
    }: {
      hackathonId: string;
      formData: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/hackathons/${hackathonId}/register`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to save draft");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-registration", variables.hackathonId],
      });
    },
  });
}

export function useEditHackathonRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hackathonId,
      formData,
    }: {
      hackathonId: string;
      formData: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/hackathons/${hackathonId}/register`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update application");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-registration", variables.hackathonId],
      });
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
    },
  });
}

// ─── RSVP ───

export function useHackathonRsvp(hackathonId: string | undefined) {
  return useQuery<{ data: { confirmed: number; pending: number; declined: number; total: number; deadline: string | null } }>({
    queryKey: ["hackathon-rsvp", hackathonId],
    queryFn: () =>
      fetchJson(`/api/hackathons/${hackathonId}/rsvp`),
    enabled: !!hackathonId,
  });
}

export function useRespondRsvp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hackathonId,
      response,
    }: {
      hackathonId: string;
      response: "confirmed" | "declined";
    }) => {
      const res = await fetch(`/api/hackathons/${hackathonId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "RSVP failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-registration", variables.hackathonId],
      });
      queryClient.invalidateQueries({
        queryKey: ["hackathon-rsvp", variables.hackathonId],
      });
      queryClient.invalidateQueries({ queryKey: ["hackathons"] });
    },
  });
}
