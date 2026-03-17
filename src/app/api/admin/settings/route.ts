import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

/**
 * Fetch all rows from platform_settings and return them as a keyed map.
 */
async function fetchSettingsMap(): Promise<Record<string, unknown>> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .select("key, value");

  if (error) {
    throw new Error(`Failed to fetch settings: ${error.message}`);
  }

  const map: Record<string, unknown> = {};
  for (const row of data || []) {
    map[row.key as string] = row.value;
  }
  return map;
}

/**
 * Verify the current user is authenticated and has the admin role.
 * Returns the user ID on success, or a NextResponse error on failure.
 */
async function verifyAdmin(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single();

  const roles = (profile?.roles as string[]) || [];
  if (!roles.includes("admin")) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { userId: user.id };
}

/**
 * GET /api/admin/settings
 *
 * Returns all platform settings as a keyed map.
 */
export async function GET() {
  try {
    const auth = await verifyAdmin();
    if ("error" in auth) return auth.error;

    const settings = await fetchSettingsMap();

    return NextResponse.json({ data: settings });
  } catch (err) {
    console.error("[admin/settings] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings
 *
 * Upserts a single platform setting by key.
 * Body: { key: string, value: Record<string, unknown> }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { key, value } = body as {
      key: string;
      value: Record<string, unknown>;
    };

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'key'" },
        { status: 400 }
      );
    }

    // Allowlist of valid setting keys to prevent arbitrary data injection
    const ALLOWED_KEYS = new Set([
      "branding", "theme", "features", "integrations", "notifications",
      "email", "billing", "registration", "moderation", "analytics",
      "seo", "social", "maintenance", "limits", "security",
    ]);
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json(
        { error: `Unknown setting key "${key}". Allowed keys: ${[...ALLOWED_KEYS].join(", ")}` },
        { status: 400 }
      );
    }

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return NextResponse.json(
        { error: "Missing or invalid 'value' (must be a JSON object)" },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdminClient();

    // Fetch old value for audit log
    const { data: existing } = await admin
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .single();

    const oldValue = existing?.value ?? null;

    // Upsert the setting
    const { error: upsertError } = await admin
      .from("platform_settings")
      .upsert(
        {
          key,
          value,
          updated_by: auth.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (upsertError) {
      console.error("[admin/settings] Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to update setting" },
        { status: 500 }
      );
    }

    // Write audit log with old and new values
    await writeAuditLog(
      {
        actorId: auth.userId,
        action: "platform_setting.update",
        entityType: "platform_setting",
        entityId: key,
        oldValues: { [key]: oldValue },
        newValues: { [key]: value },
        status: "success",
      },
      request
    );

    // Return the full updated settings map
    const settings = await fetchSettingsMap();

    return NextResponse.json({ data: settings });
  } catch (err) {
    console.error("[admin/settings] PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
