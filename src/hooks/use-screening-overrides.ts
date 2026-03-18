import { fetchJson } from "@/lib/fetch-json";
import { useQuery } from "@tanstack/react-query";

export interface ScreeningOverride {
  id: string;
  hackathon_id: string;
  registration_id: string;
  previous_status: string;
  new_status: string;
  overridden_by: string;
  reason: string | null;
  created_at: string;
  overrider?: {
    full_name: string | null;
    email: string | null;
  };
}

export function useScreeningOverrides(
  hackathonId: string | undefined,
  registrationId?: string
) {
  const params = new URLSearchParams();
  if (registrationId) params.set("registrationId", registrationId);
  const qs = params.toString();

  return useQuery<{ data: ScreeningOverride[] }>({
    queryKey: ["screening-overrides", hackathonId, registrationId],
    queryFn: () =>
      fetchJson<{ data: ScreeningOverride[] }>(
        `/api/hackathons/${hackathonId}/screening-overrides${qs ? `?${qs}` : ""}`
      ),
    enabled: !!hackathonId,
  });
}
