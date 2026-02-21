import { useQuery, useMutation } from "@tanstack/react-query";

interface InvitationData {
  id: string;
  email: string;
  name: string;
  status: "pending" | "accepted";
  hackathonName: string;
}

export function useJudgeInvitation(
  hackathonId: string,
  token: string | null
) {
  return useQuery({
    queryKey: ["judge-invitation", hackathonId, token],
    queryFn: async (): Promise<{ data: InvitationData }> => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/judges/accept?token=${token}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Invalid invitation");
      }
      return res.json();
    },
    enabled: !!token && !!hackathonId,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({
      hackathonId,
      token,
    }: {
      hackathonId: string;
      token: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/judges/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to accept invitation");
      }
      return res.json();
    },
  });
}

export function useSendJudgeInvitation() {
  return useMutation({
    mutationFn: async ({
      hackathonId,
      email,
      name,
    }: {
      hackathonId: string;
      email: string;
      name: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/judges/invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to send invitation");
      }
      return res.json();
    },
  });
}
