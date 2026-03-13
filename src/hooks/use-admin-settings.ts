import { fetchJson } from "@/lib/fetch-json";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeneralSettings {
  platformName: string;
  description: string;
  supportEmail: string;
}

export interface FeatureSettings {
  userRegistration: boolean;
  hackathons: boolean;
  blog: boolean;
  apiAccess: boolean;
  publicProfiles: boolean;
  communities: boolean;
}

export interface MaintenanceSettings {
  maintenanceMode: boolean;
}

export interface PlatformSettings {
  general: GeneralSettings;
  features: FeatureSettings;
  maintenance: MaintenanceSettings;
}

interface SettingsResponse {
  data: PlatformSettings;
}

interface UpdateSettingVariables {
  key: keyof PlatformSettings;
  value: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Query key
// ---------------------------------------------------------------------------

const SETTINGS_KEY = ["admin-settings"] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all platform settings from the admin API.
 */
export function useAdminSettings() {
  return useQuery<SettingsResponse>({
    queryKey: SETTINGS_KEY,
    queryFn: () => fetchJson<SettingsResponse>("/api/admin/settings"),
    staleTime: 60 * 1000, // cache for 1 minute
    retry: false,
  });
}

/**
 * Mutation hook to update a single platform setting by key.
 * Invalidates the settings cache on success.
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation<SettingsResponse, Error, UpdateSettingVariables>({
    mutationFn: async ({ key, value }: UpdateSettingVariables) => {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Request failed: ${res.status}`);
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}
