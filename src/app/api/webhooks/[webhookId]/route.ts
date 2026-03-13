import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { canUseApi } from "@/lib/plan-limits";
import { WEBHOOK_EVENTS, validateWebhookEvents } from "@/lib/webhook-delivery";
import { validateWebhookUrl } from "@/lib/webhook-validation";
import { UUID_RE } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;

    if (!UUID_RE.test(webhookId)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/webhooks");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Enterprise gating for session users (API key users are checked centrally in authenticateApiKey)
    if (auth.type === "session") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", auth.userId)
        .single();

      const tier = (profile?.subscription_tier as SubscriptionTier) || "free";
      if (!canUseApi(tier)) {
        return NextResponse.json(
          { error: "Webhooks are available on the Enterprise plan" },
          { status: 403 }
        );
      }
    }

    const { data: webhook, error } = await supabase
      .from("webhooks")
      .select("id, url, description, events, status, failure_count, last_triggered_at, created_at, updated_at")
      .eq("id", webhookId)
      .eq("user_id", auth.userId)
      .single();

    if (error || !webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Fetch recent deliveries for this webhook (last 50)
    const { data: deliveries } = await supabase
      .from("webhook_deliveries")
      .select("id, event_type, response_status, success, duration_ms, error, created_at")
      .eq("webhook_id", webhookId)
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      data: { ...webhook, recentDeliveries: deliveries || [] },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;

    if (!UUID_RE.test(webhookId)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/webhooks");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Enterprise gating for session users (API key users are checked centrally in authenticateApiKey)
    if (auth.type === "session") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", auth.userId)
        .single();

      const tier = (profile?.subscription_tier as SubscriptionTier) || "free";
      if (!canUseApi(tier)) {
        return NextResponse.json(
          { error: "Webhooks are available on the Enterprise plan" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    // Validate URL if provided
    if (body.url !== undefined) {
      if (typeof body.url !== "string" || body.url.trim().length === 0) {
        return NextResponse.json({ error: "URL must be a non-empty string" }, { status: 400 });
      }
      const url = body.url.trim();
      const urlError = validateWebhookUrl(url);
      if (urlError) {
        return NextResponse.json({ error: urlError }, { status: 400 });
      }
      updates.url = url;
    }

    // Validate events if provided
    if (body.events !== undefined) {
      if (!Array.isArray(body.events) || body.events.length === 0) {
        return NextResponse.json(
          { error: "events must be a non-empty array" },
          { status: 400 }
        );
      }
      if (body.events.length > WEBHOOK_EVENTS.length) {
        return NextResponse.json(
          { error: `Maximum ${WEBHOOK_EVENTS.length} event types` },
          { status: 400 }
        );
      }
      if (!validateWebhookEvents(body.events)) {
        return NextResponse.json(
          { error: "Invalid event type(s)", validEvents: WEBHOOK_EVENTS },
          { status: 400 }
        );
      }
      updates.events = body.events;
    }

    // Validate status
    if (body.status !== undefined) {
      if (!["active", "paused"].includes(body.status)) {
        return NextResponse.json(
          { error: 'Status must be "active" or "paused"' },
          { status: 400 }
        );
      }
      updates.status = body.status;
      // Reset failure count when reactivating
      if (body.status === "active") {
        updates.failure_count = 0;
      }
    }

    // Validate description
    if (body.description !== undefined) {
      updates.description =
        body.description && typeof body.description === "string"
          ? body.description.slice(0, 200)
          : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Atomic ownership check + update in a single query
    const { data, error } = await supabase
      .from("webhooks")
      .update(updates)
      .eq("id", webhookId)
      .eq("user_id", auth.userId)
      .select("id, url, description, events, status, failure_count, last_triggered_at, created_at, updated_at")
      .single();

    if (error || !data) {
      if (error?.code === "PGRST116") {
        return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Failed to update webhook" }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> }
) {
  try {
    const { webhookId } = await params;

    if (!UUID_RE.test(webhookId)) {
      return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/webhooks");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Enterprise gating for session users (API key users are checked centrally in authenticateApiKey)
    if (auth.type === "session") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", auth.userId)
        .single();

      const tier = (profile?.subscription_tier as SubscriptionTier) || "free";
      if (!canUseApi(tier)) {
        return NextResponse.json(
          { error: "Webhooks are available on the Enterprise plan" },
          { status: 403 }
        );
      }
    }

    // Verify ownership before delete
    const { data: existing } = await supabase
      .from("webhooks")
      .select("id")
      .eq("id", webhookId)
      .eq("user_id", auth.userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("webhooks")
      .delete()
      .eq("id", webhookId)
      .eq("user_id", auth.userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete webhook" }, { status: 400 });
    }

    return NextResponse.json({ message: "Webhook deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
