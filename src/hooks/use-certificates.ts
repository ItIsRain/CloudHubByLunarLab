import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { fetchJson } from "@/lib/fetch-json";
import type { CertificateWithMeta } from "@/lib/supabase/mappers";

interface CertificatesResponse {
  data: CertificateWithMeta[];
}

interface CertificateResponse {
  data: CertificateWithMeta;
}

interface VerifyResponse {
  data: CertificateWithMeta;
  verified: boolean;
}

interface CertificateFilters {
  type?: string;
  event_id?: string;
  hackathon_id?: string;
}

function buildCertificateParams(filters?: CertificateFilters): string {
  if (!filters) return "";
  const params = new URLSearchParams();
  if (filters.type) params.set("type", filters.type);
  if (filters.event_id) params.set("event_id", filters.event_id);
  if (filters.hackathon_id) params.set("hackathon_id", filters.hackathon_id);
  const str = params.toString();
  return str ? `?${str}` : "";
}

/** Fetch authenticated user's certificates */
export function useCertificates(filters?: CertificateFilters) {
  const user = useAuthStore((s) => s.user);

  return useQuery<CertificatesResponse>({
    queryKey: ["certificates", user?.id, filters],
    queryFn: () =>
      fetchJson<CertificatesResponse>(
        `/api/certificates${buildCertificateParams(filters)}`
      ),
    enabled: !!user?.id,
  });
}

/** Fetch a single certificate by ID */
export function useCertificate(id: string | undefined) {
  return useQuery<CertificateResponse>({
    queryKey: ["certificates", id],
    queryFn: () =>
      fetchJson<CertificateResponse>(`/api/certificates/${id}`),
    enabled: !!id,
  });
}

/** Issue a certificate (organizer mutation) */
export function useIssueCertificate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      user_id: string;
      event_id?: string;
      hackathon_id?: string;
      type: string;
      title: string;
      description?: string;
    }) => {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to issue certificate");
      }
      return res.json() as Promise<CertificateResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificates"] });
    },
  });
}

/** Verify a certificate by its verification code (public, no auth needed) */
export function useVerifyCertificate(code: string | undefined) {
  return useQuery<VerifyResponse>({
    queryKey: ["certificates", "verify", code],
    queryFn: () =>
      fetchJson<VerifyResponse>(`/api/certificates/verify/${code}`),
    enabled: !!code && code.length >= 5,
    retry: false,
  });
}
