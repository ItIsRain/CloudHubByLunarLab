import { createHmac, randomUUID } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// =====================================================
// Webhook Event Types
// =====================================================

export const WEBHOOK_EVENTS = [
  "event.registration.created",
  "event.registration.cancelled",
  "event.guest.status_changed",
  "competition.registration.created",
  "competition.registration.cancelled",
  "hackathon.participant.status_changed",
  "submission.created",
  "submission.updated",
  "submission.submitted",
  "submission.scored",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

// =====================================================
// Webhook Payload Signing (HMAC-SHA256)
// =====================================================

function signPayload(payload: string, secret: string, timestamp: string): string {
  const message = `${timestamp}.${payload}`;
  return createHmac("sha256", secret).update(message).digest("hex");
}

// =====================================================
// Delivery Engine
// =====================================================

const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_AUTO_DISABLE_FAILURES = 10;

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
  failure_count: number;
}

/**
 * Fire webhooks for a given event.
 *
 * This is a fire-and-forget function — it does NOT block the caller.
 * It queries all active webhooks for the given user that subscribe to
 * the event type, then delivers payloads in parallel.
 *
 * @param userId   The organizer's user ID (webhooks belong to users)
 * @param event    The webhook event type
 * @param data     The payload data to send
 */
export function fireWebhooks(
  userId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): void {
  // Run entirely async — don't block the request
  void deliverWebhooks(userId, event, data).catch((err) => {
    console.error(`[webhooks] Fatal error delivering ${event}:`, err);
  });
}

async function deliverWebhooks(
  userId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const admin = getSupabaseAdminClient();

  // Fetch all active webhooks for this user that listen to this event
  const { data: webhooks, error } = await admin
    .from("webhooks")
    .select("id, url, secret, failure_count")
    .eq("user_id", userId)
    .eq("status", "active")
    .contains("events", [event]);

  if (error || !webhooks || webhooks.length === 0) return;

  // Deliver to all matching webhooks in parallel
  await Promise.allSettled(
    (webhooks as WebhookRow[]).map((wh) => deliverToEndpoint(admin, wh, event, data))
  );
}

async function deliverToEndpoint(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  webhook: WebhookRow,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  const deliveryId = randomUUID();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = JSON.stringify({
    id: deliveryId,
    event,
    created_at: new Date().toISOString(),
    data,
  });

  const signature = signPayload(payload, webhook.secret, timestamp);

  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;
  let errorMessage: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CloudHub-Event": event,
        "X-CloudHub-Delivery": deliveryId,
        "X-CloudHub-Timestamp": timestamp,
        "X-CloudHub-Signature-256": `sha256=${signature}`,
        "User-Agent": "CloudHub-Webhook/1.0",
      },
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = response.status;

    // Read up to 4KB of response body for logging
    responseBody = await response.text().then((t) => t.slice(0, 4096));
    success = response.ok; // 2xx
  } catch (err) {
    errorMessage =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timeout: delivery exceeded 10s"
          : err.message
        : "Unknown delivery error";
  }

  const durationMs = Date.now() - startTime;

  // Log the delivery attempt
  void admin
    .from("webhook_deliveries")
    .insert({
      webhook_id: webhook.id,
      event_type: event,
      payload: { event, data },
      response_status: responseStatus,
      response_body: responseBody,
      success,
      duration_ms: durationMs,
      error: errorMessage,
    })
    .then();

  // Update webhook metadata
  if (success) {
    // Reset failure count on success
    void admin
      .from("webhooks")
      .update({ failure_count: 0, last_triggered_at: new Date().toISOString() })
      .eq("id", webhook.id)
      .then();
  } else {
    const newFailureCount = (webhook.failure_count || 0) + 1;
    const updates: Record<string, unknown> = {
      failure_count: newFailureCount,
      last_triggered_at: new Date().toISOString(),
    };

    // Auto-pause after MAX_AUTO_DISABLE_FAILURES consecutive failures
    if (newFailureCount >= MAX_AUTO_DISABLE_FAILURES) {
      updates.status = "paused";
      console.warn(
        `[webhooks] Auto-paused webhook ${webhook.id} after ${newFailureCount} consecutive failures`
      );
    }

    void admin.from("webhooks").update(updates).eq("id", webhook.id).then();
  }
}

/**
 * Validate that all event names are valid WebhookEventType values.
 */
export function validateWebhookEvents(events: string[]): events is WebhookEventType[] {
  return events.every((e) =>
    (WEBHOOK_EVENTS as readonly string[]).includes(e)
  );
}
