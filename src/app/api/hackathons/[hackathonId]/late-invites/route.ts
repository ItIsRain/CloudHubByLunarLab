import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit, type HackathonRole } from "@/lib/check-hackathon-access";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

async function authenticateAndAuthorize(request: NextRequest, hackathonId: string) {
  const auth = await authenticateRequest(request);
  if (auth.type === "unauthenticated") {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }
  if (auth.type === "api_key") {
    const scopeError = assertScope(auth, "/api/hackathons");
    if (scopeError) return { error: NextResponse.json({ error: scopeError }, { status: 403 }) };
  }

  const supabase =
    auth.type === "api_key"
      ? getSupabaseAdminClient()
      : await getSupabaseServerClient();

  const access = await checkHackathonAccess(supabase, hackathonId, auth.userId);
  if (!access.hasAccess) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    supabase: getSupabaseAdminClient(),
    userId: auth.userId,
    role: access.role as HackathonRole,
  };
}

/** URL-safe random token. ~192 bits of entropy, base64url-encoded. */
function generateToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// ── GET — list invites for this hackathon ─────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }
    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;

    const { supabase } = result;

    const { data: invites, error } = await supabase
      .from("late_registration_invites")
      .select("*")
      .eq("hackathon_id", hackathonId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch late invites:", error);
      return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
    }

    // Pull the latest few claims per invite so the UI can show "used by X".
    const ids = (invites ?? []).map((i) => i.id as string);
    const claimsByInvite: Record<
      string,
      Array<{ id: string; user_id: string; claimed_at: string; user?: { name: string | null; email: string | null } | null }>
    > = {};
    if (ids.length > 0) {
      const { data: claimRows } = await supabase
        .from("late_registration_invite_claims")
        .select(
          "id, invite_id, user_id, claimed_at, user:profiles!late_registration_invite_claims_user_id_fkey(id, name, email)"
        )
        .in("invite_id", ids)
        .order("claimed_at", { ascending: false });
      for (const c of claimRows ?? []) {
        const row = c as Record<string, unknown>;
        const iid = row.invite_id as string;
        const u = Array.isArray(row.user) ? row.user[0] : row.user;
        (claimsByInvite[iid] ||= []).push({
          id: row.id as string,
          user_id: row.user_id as string,
          claimed_at: row.claimed_at as string,
          user: u as { name: string | null; email: string | null } | null,
        });
      }
    }

    const data = (invites ?? []).map((i) => ({
      ...i,
      claims: claimsByInvite[i.id as string] ?? [],
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST — create a new invite ───────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }
    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase, userId, role } = result;

    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 20 invites per organizer per hour — enough for batch outreach,
    // tight enough to discourage scripting an enumeration list.
    const rl = checkRateLimit(userId, {
      namespace: "late-invite-create",
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many invite links created. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const label = body.label === undefined ? null : String(body.label || "").trim() || null;
    const email = body.email === undefined || body.email === null
      ? null
      : String(body.email).trim().toLowerCase();
    const maxUses = Number(body.max_uses ?? 1);
    const expiresAt = body.expires_at ? new Date(String(body.expires_at)) : null;

    if (label && label.length > 200) {
      return NextResponse.json({ error: "label must be ≤ 200 chars" }, { status: 400 });
    }
    if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320)) {
      return NextResponse.json({ error: "email is invalid" }, { status: 400 });
    }
    if (!Number.isFinite(maxUses) || maxUses < 1 || maxUses > 1000) {
      return NextResponse.json(
        { error: "max_uses must be between 1 and 1000" },
        { status: 400 }
      );
    }
    if (expiresAt) {
      if (Number.isNaN(expiresAt.getTime())) {
        return NextResponse.json({ error: "expires_at is invalid" }, { status: 400 });
      }
      if (expiresAt.getTime() < Date.now()) {
        return NextResponse.json(
          { error: "expires_at must be in the future" },
          { status: 400 }
        );
      }
    }

    // Token collisions are vanishingly rare with 192 bits — retry once just
    // to be defensive against partitioned generators.
    let inserted: Record<string, unknown> | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const token = generateToken();
      const { data, error } = await supabase
        .from("late_registration_invites")
        .insert({
          hackathon_id: hackathonId,
          token,
          label,
          email,
          max_uses: maxUses,
          expires_at: expiresAt?.toISOString() ?? null,
          created_by: userId,
        })
        .select("*")
        .single();
      if (!error) {
        inserted = data;
        break;
      }
      lastErr = error;
      // 23505 = unique constraint violation on token
      if (error.code !== "23505") break;
    }

    if (!inserted) {
      console.error("Failed to create late invite:", lastErr);
      return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
    }

    return NextResponse.json({ data: { ...inserted, claims: [] } }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
