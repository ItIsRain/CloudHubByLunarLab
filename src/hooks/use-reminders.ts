import { fetchJson } from "@/lib/fetch-json";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ReminderRule {
  id: string;
  hackathon_id: string;
  name: string;
  reminder_type: "incomplete_application" | "deadline_approaching" | "rsvp_confirmation";
  enabled: boolean;
  trigger_days_before: number | null;
  trigger_hours_before: number | null;
  email_subject: string;
  email_body: string;
  last_sent_at: string | null;
  recipient_filter: Record<string, unknown>;
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

export function useReminderRules(hackathonId: string | undefined) {
  return useQuery<{ data: ReminderRule[] }>({
    queryKey: ["reminder-rules", hackathonId],
    queryFn: () =>
      fetchJson<{ data: ReminderRule[] }>(
        `/api/hackathons/${hackathonId}/reminders`
      ),
    enabled: !!hackathonId,
  });
}

export function useCreateReminderRule(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rule: {
      name: string;
      reminder_type: string;
      enabled?: boolean;
      trigger_days_before?: number | null;
      trigger_hours_before?: number | null;
      email_subject: string;
      email_body: string;
      recipient_filter?: Record<string, unknown>;
    }) =>
      mutate<{ data: ReminderRule }>(
        `/api/hackathons/${hackathonId}/reminders`,
        "POST",
        rule
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminder-rules", hackathonId] });
    },
  });
}

export function useUpdateReminderRule(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ruleId,
      ...data
    }: {
      ruleId: string;
      name?: string;
      reminder_type?: string;
      enabled?: boolean;
      trigger_days_before?: number | null;
      trigger_hours_before?: number | null;
      email_subject?: string;
      email_body?: string;
      recipient_filter?: Record<string, unknown>;
    }) =>
      mutate<{ data: ReminderRule }>(
        `/api/hackathons/${hackathonId}/reminders`,
        "PATCH",
        { ruleId, ...data }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminder-rules", hackathonId] });
    },
  });
}

export function useDeleteReminderRule(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      mutate(
        `/api/hackathons/${hackathonId}/reminders`,
        "DELETE",
        { ruleId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminder-rules", hackathonId] });
    },
  });
}

export function useTriggerReminder(hackathonId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) =>
      mutate<{ data: { sent: number; failed: number; total: number; message?: string } }>(
        `/api/hackathons/${hackathonId}/reminders`,
        "POST",
        { action: "trigger", ruleId }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminder-rules", hackathonId] });
    },
  });
}
