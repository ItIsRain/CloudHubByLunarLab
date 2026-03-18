import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// =====================================================
// Types
// =====================================================

export type CollaboratorRole = "admin" | "editor" | "viewer";

export interface CollaboratorUser {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

export interface Collaborator {
  id: string;
  hackathonId: string;
  userId: string;
  role: CollaboratorRole;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  user: CollaboratorUser | null;
}

interface CollaboratorsResponse {
  data: Collaborator[];
}

interface CollaboratorResponse {
  data: Collaborator;
}

// =====================================================
// Hooks
// =====================================================

export function useCollaborators(hackathonId: string | undefined) {
  return useQuery<CollaboratorsResponse>({
    queryKey: ["collaborators", hackathonId],
    queryFn: () =>
      fetchJson<CollaboratorsResponse>(
        `/api/hackathons/${hackathonId}/collaborators`
      ),
    enabled: !!hackathonId,
  });
}

export function useInviteCollaborator(hackathonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      role: CollaboratorRole;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/collaborators`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to invite collaborator");
      }
      return res.json() as Promise<CollaboratorResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collaborators", hackathonId],
      });
    },
  });
}

export function useUpdateCollaboratorRole(hackathonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      collaboratorId: string;
      role: CollaboratorRole;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/collaborators`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update role");
      }
      return res.json() as Promise<CollaboratorResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collaborators", hackathonId],
      });
    },
  });
}

export function useRemoveCollaborator(hackathonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collaboratorId: string) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/collaborators?collaboratorId=${collaboratorId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to remove collaborator");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collaborators", hackathonId],
      });
    },
  });
}
