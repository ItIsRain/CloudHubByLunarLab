import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  generateApiKey,
  hashApiKey,
  extractPrefix,
  validateScopes,
  API_SCOPES,
  MAX_ACTIVE_KEYS,
} from "@/lib/api-keys";
import { canUseApi } from "@/lib/plan-limits";
import type { SubscriptionTier } from "@/lib/types";

// =====================================================
// GET /api/keys — List current user's API keys
// POST /api/keys — Create a new API key
// Both require session auth (no API key auth for key management)
// =====================================================

const createKeySchema = z.object({
  name: z
    .string()
    .min(1, "Key name is required")
    .max(100, "Key name must be 100 characters or less")
    .trim(),
  scopes: z
    .array(z.enum(API_SCOPES))
    .min(1, "At least one scope is required"),
});

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, status, last_used, created_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch API keys:", error);
      return NextResponse.json(
        { error: "Failed to fetch API keys" },
        { status: 500 }
      );
    }

    const mapped = (keys ?? []).map((k) => ({
      id: k.id as string,
      name: k.name as string,
      maskedKey: `${k.key_prefix as string}...`,
      scopes: k.scopes as string[],
      status: k.status as string,
      lastUsed: k.last_used as string | null,
      createdAt: k.created_at as string,
      revokedAt: k.revoked_at as string | null,
    }));

    return NextResponse.json(
      { data: mapped },
      { headers: { "Cache-Control": "private, no-store" } }
    );
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
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check subscription tier for API access
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier = (profile?.subscription_tier as SubscriptionTier) ?? "free";

    if (!canUseApi(tier)) {
      return NextResponse.json(
        {
          error:
            "API access is not available on the free plan. Upgrade to Enterprise to create API keys.",
          code: "PLAN_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    // Validate request body
    const body: unknown = await request.json();
    const parsed = createKeySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, scopes } = parsed.data;

    if (!validateScopes(scopes)) {
      return NextResponse.json(
        { error: "Invalid scopes provided" },
        { status: 400 }
      );
    }

    // Enforce max active keys limit
    const { count: activeCount } = await supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");

    if ((activeCount ?? 0) >= MAX_ACTIVE_KEYS) {
      return NextResponse.json(
        {
          error: `You can have at most ${MAX_ACTIVE_KEYS} active API keys. Revoke an existing key first.`,
        },
        { status: 400 }
      );
    }

    // Generate key, hash, and prefix
    const rawKey = generateApiKey();
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = extractPrefix(rawKey);

    const { data: inserted, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        name,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        scopes,
        status: "active",
      })
      .select("id, name, key_prefix, scopes, status, created_at")
      .single();

    if (insertError) {
      console.error("Failed to create API key:", insertError);
      return NextResponse.json(
        { error: "Failed to create API key" },
        { status: 500 }
      );
    }

    // Return the full raw key exactly once
    return NextResponse.json({
      data: {
        id: inserted.id as string,
        name: inserted.name as string,
        key: rawKey,
        maskedKey: `${inserted.key_prefix as string}...`,
        scopes: inserted.scopes as string[],
        status: inserted.status as string,
        createdAt: inserted.created_at as string,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
