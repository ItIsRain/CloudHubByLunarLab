import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HackathonAnnouncement } from "@/lib/types";


export function useHackathonAnnouncements(hackathonId: string | undefined) {
  return useQuery<{ data: HackathonAnnouncement[] }>({
    queryKey: ["hackathon-announcements", hackathonId],
    queryFn: () =>
      fetchJson(`/api/hackathons/${hackathonId}/announcements`),
    enabled: !!hackathonId,
  });
}

export function useSendAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      hackathonId,
      title,
      message,
    }: {
      hackathonId: string;
      title: string;
      message: string;
    }) => {
      const res = await fetch(
        `/api/hackathons/${hackathonId}/announcements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, message }),
        }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to send announcement");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["hackathon-announcements", variables.hackathonId],
      });
    },
  });
}
