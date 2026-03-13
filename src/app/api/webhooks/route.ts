import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { canUseApi } from "@/lib/plan-limits";
import { WEBHOOK_EVENTS, validateWebhookEvents } from "@/lib/webhook-delivery";
import { validateWebhookUrl } from "@/lib/webhook-validation";
import type { SubscriptionTier } from "@/lib/types";

const MAX_WEBHOOKS_PER_USER = 20;

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);

    // Reject invalid Bearer tokens explicitly
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

    const { data: webhooks, error } = await supabase
      .from("webhooks")
      .select("id, url, description, events, status, failure_count, last_triggered_at, created_at, updated_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 400 });
    }

    return NextResponse.json({ data: webhooks || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Check webhook limit
    const { count } = await supabase
      .from("webhooks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId);

    if ((count || 0) >= MAX_WEBHOOKS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_WEBHOOKS_PER_USER} webhooks per account` },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate URL
    if (!body.url || typeof body.url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const url = body.url.trim();
    const urlError = validateWebhookUrl(url);
    if (urlError) {
      return NextResponse.json({ error: urlError }, { status: 400 });
    }

    // Validate events
    if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json(
        { error: "events is required (array of event types)" },
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
        {
          error: "Invalid event type(s)",
          validEvents: WEBHOOK_EVENTS,
        },
        { status: 400 }
      );
    }

    // Validate optional description
    const description =
      body.description && typeof body.description === "string"
        ? body.description.slice(0, 200)
        : null;

    // Generate signing secret
    const secret = `whsec_${randomBytes(32).toString("hex")}`;

    const { data, error } = await supabase
      .from("webhooks")
      .insert({
        user_id: auth.userId,
        url,
        description,
        events: body.events,
        secret,
        status: "active",
      })
      .select("id, url, description, events, status, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to create webhook" }, { status: 400 });
    }

    // Return secret only on creation — it's never shown again
    return NextResponse.json({
      data: { ...data, secret },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
