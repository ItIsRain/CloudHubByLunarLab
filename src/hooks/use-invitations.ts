import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EntityInvitation } from "@/lib/types";

export function useEntityInvitations(
  entityType: "event" | "hackathon",
  entityId: string,
  enabled = true
) {
  return useQuery<EntityInvitation[]>({
    queryKey: ["entity-invitations", entityType, entityId],
    queryFn: async () => {
      const res = await fetch(
        `/api/invitations?entityType=${entityType}&entityId=${entityId}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to fetch invitations");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: enabled && !!entityId,
  });
}

export function useSendEntityInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
      email,
      name,
    }: {
      entityType: "event" | "hackathon";
      entityId: string;
      email: string;
      name: string;
    }) => {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, email, name }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to send invitation");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["entity-invitations", variables.entityType, variables.entityId],
      });
    },
  });
}

export function useRevokeEntityInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch("/api/invitations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to revoke invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-invitations"] });
    },
  });
}

interface ValidateInvitationData {
  id: string;
  email: string;
  name: string;
  status: string;
  entityType: "event" | "hackathon";
  entityId: string;
  entityName: string;
  entitySlug: string;
}

export function useValidateInvitation(token: string | null) {
  return useQuery<ValidateInvitationData>({
    queryKey: ["validate-invitation", token],
    queryFn: async () => {
      const res = await fetch(`/api/invitations/accept?token=${token}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Invalid invitation");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptEntityInvitation() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to accept invitation");
      }
      return res.json();
    },
  });
}
