import { fetchJson } from "@/lib/fetch-json";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface CertNameBox {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;
  fontWeight: "normal" | "bold";
  alignment: "left" | "center" | "right";
  fontFamily: "Helvetica" | "TimesRoman" | "Courier";
}

export type CertType =
  | "participation"
  | "winner"
  | "runner_up"
  | "mentor"
  | "judge"
  | "organizer"
  | "speaker"
  | "volunteer";

export interface CertificateTemplate {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  pdf_url: string;
  pdf_public_id: string | null;
  pdf_bytes: number | null;
  page_width: number;
  page_height: number;
  name_box: CertNameBox;
  cert_type: CertType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sentCount?: number;
}

export interface CertificateSendSummary {
  id: string;
  recipient_email: string;
  recipient_name: string;
  status: "sent" | "failed";
  sent_at: string;
}

export type CertAudience =
  | { audience: "all"; subject: string; body: string }
  | { audience: "status"; statuses: string[]; subject: string; body: string }
  | { audience: "winners"; trackIds?: string[]; subject: string; body: string }
  | {
      audience: "registration_ids";
      registrationIds: string[];
      subject: string;
      body: string;
    }
  | { audience: "team_ids"; teamIds: string[]; subject: string; body: string };

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useCertificateTemplates(hackathonId: string | undefined) {
  return useQuery<{ data: CertificateTemplate[] }>({
    queryKey: ["certificate-templates", hackathonId],
    queryFn: () =>
      fetchJson<{ data: CertificateTemplate[] }>(
        `/api/hackathons/${hackathonId}/certificate-templates`
      ),
    enabled: !!hackathonId,
  });
}

export function useCertificateTemplate(
  hackathonId: string | undefined,
  templateId: string | undefined
) {
  return useQuery<{
    data: { template: CertificateTemplate; sends: CertificateSendSummary[] };
  }>({
    queryKey: ["certificate-template", hackathonId, templateId],
    queryFn: () =>
      fetchJson(
        `/api/hackathons/${hackathonId}/certificate-templates/${templateId}`
      ),
    enabled: !!hackathonId && !!templateId,
  });
}

export function useCreateCertificateTemplate(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      description?: string | null;
      pdf_url: string;
      pdf_public_id?: string | null;
      pdf_bytes?: number;
      page_width: number;
      page_height: number;
      name_box: CertNameBox;
      cert_type?: CertType;
    }) =>
      mutate<{ data: CertificateTemplate }>(
        `/api/hackathons/${hackathonId}/certificate-templates`,
        "POST",
        payload
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificate-templates", hackathonId] });
    },
  });
}

export function useUpdateCertificateTemplate(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      ...patch
    }: {
      templateId: string;
      name?: string;
      description?: string | null;
      name_box?: CertNameBox;
      cert_type?: CertType;
    }) =>
      mutate<{ data: CertificateTemplate }>(
        `/api/hackathons/${hackathonId}/certificate-templates/${templateId}`,
        "PATCH",
        patch
      ),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["certificate-templates", hackathonId] });
      qc.invalidateQueries({
        queryKey: ["certificate-template", hackathonId, variables.templateId],
      });
    },
  });
}

export function useDeleteCertificateTemplate(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      mutate<{ message: string }>(
        `/api/hackathons/${hackathonId}/certificate-templates/${templateId}`,
        "DELETE"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["certificate-templates", hackathonId] });
    },
  });
}

export function useSendCertificates(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      payload,
    }: {
      templateId: string;
      payload: CertAudience;
    }) =>
      mutate<{ data: { sent: number; failed: number; total: number; message?: string } }>(
        `/api/hackathons/${hackathonId}/certificate-templates/${templateId}/send`,
        "POST",
        payload
      ),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["certificate-templates", hackathonId] });
      qc.invalidateQueries({
        queryKey: ["certificate-template", hackathonId, v.templateId],
      });
    },
  });
}
