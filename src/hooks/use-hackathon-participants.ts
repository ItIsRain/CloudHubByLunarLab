import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HackathonParticipant } from "@/lib/types";


export function useHackathonParticipants(
  hackathonId: string | undefined,
  status?: string
) {
  const params = new URLSearchParams();
  if (status && status !== "all") params.set("status", status);
  const qs = params.toString();
  return useQuery<{ data: HackathonParticipant[] }>({
    queryKey: ["hackathon-participants", hackathonId, status],
    queryFn: () =>
      fetchJson(
        `/api/hackathons/${hackathonId}/participants${qs ? `?${qs}` : ""}`
      ),
    enabled: !!hackathonId,
  });
}

export function useUpdateParticipantStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hackathonId,
      registrationId,
      status,
    }: {
      hackathonId: string;
      registrationId: string;
      status: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/participants`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId, status }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-participants", variables.hackathonId],
      });
    },
  });
}
