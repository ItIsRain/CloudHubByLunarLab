import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface EmailTemplate {
  id: string;
  hackathon_id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  placeholders: { key: string; description?: string }[];
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

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

export function useEmailTemplates(hackathonId: string | undefined) {
  return useQuery<{ data: EmailTemplate[] }>({
    queryKey: ["email-templates", hackathonId],
    queryFn: () =>
      fetchJson<{ data: EmailTemplate[] }>(
        `/api/hackathons/${hackathonId}/email-templates`
      ),
    enabled: !!hackathonId,
  });
}

export function useCreateEmailTemplate(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (template: {
      name: string;
      subject: string;
      body: string;
      category?: string;
      placeholders?: { key: string; description?: string }[];
    }) =>
      mutate<{ data: EmailTemplate }>(
        `/api/hackathons/${hackathonId}/email-templates`,
        "POST",
        template
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates", hackathonId] });
    },
  });
}

export function useUpdateEmailTemplate(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      ...data
    }: {
      templateId: string;
      name?: string;
      subject?: string;
      body?: string;
      category?: string;
      placeholders?: { key: string; description?: string }[];
      is_default?: boolean;
    }) =>
      mutate<{ data: EmailTemplate }>(
        `/api/hackathons/${hackathonId}/email-templates`,
        "PATCH",
        { templateId, ...data }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates", hackathonId] });
    },
  });
}

export function useDeleteEmailTemplate(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/email-templates`,
        "DELETE",
        { templateId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-templates", hackathonId] });
    },
  });
}

// ── Bulk Email Sending ─────────────────────────────────────

export function useSendBulkEmail(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      subject: string;
      body: string;
      recipientFilter: {
        status?: string[];
        campuses?: string[];
      };
      templateId?: string;
      scheduledAt?: string;
    }) =>
      mutate(
        `/api/hackathons/${hackathonId}/email-templates`,
        "PUT",
        payload
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-log", hackathonId] });
      qc.invalidateQueries({ queryKey: ["scheduled-emails", hackathonId] });
    },
  });
}

// ── Scheduled Emails ─────────────────────────────────────

export interface ScheduledEmail {
  id: string;
  hackathon_id: string;
  subject: string;
  body: string;
  recipient_filter: { status?: string[]; campuses?: string[] };
  scheduled_at: string;
  status: "pending" | "sending" | "sent" | "failed" | "cancelled";
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export function useScheduledEmails(hackathonId: string | undefined) {
  return useQuery<{ data: ScheduledEmail[] }>({
    queryKey: ["scheduled-emails", hackathonId],
    queryFn: () =>
      fetchJson<{ data: ScheduledEmail[] }>(
        `/api/hackathons/${hackathonId}/email-templates?scheduled=true`
      ),
    enabled: !!hackathonId,
  });
}

export function useCancelScheduledEmail(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (emailId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/email-templates`,
        "PATCH",
        { scheduledEmailId: emailId, action: "cancel_scheduled" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-emails", hackathonId] });
    },
  });
}

export function useUpdateScheduledEmail(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      scheduledEmailId: string;
      subject?: string;
      body?: string;
      scheduledAt?: string;
      recipientFilter?: { status?: string[]; campuses?: string[] };
    }) =>
      mutate<{ data: ScheduledEmail }>(
        `/api/hackathons/${hackathonId}/email-templates`,
        "PATCH",
        { action: "update_scheduled", ...payload }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scheduled-emails", hackathonId] });
    },
  });
}
