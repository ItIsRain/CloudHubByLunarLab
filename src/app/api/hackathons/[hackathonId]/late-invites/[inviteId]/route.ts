import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { checkHackathonAccess, canEdit, type HackathonRole } from "@/lib/check-hackathon-access";

type RouteParams = {
  params: Promise<{ hackathonId: string; inviteId: string }>;
};

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
    role: access.role as HackathonRole,
  };
}

// ── PATCH — change label/email/expiry, revoke, or extend ─
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, inviteId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(inviteId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }
    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase, role } = result;

    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};

    if (body.label !== undefined) {
      const label = body.label === null ? null : String(body.label).trim() || null;
      if (label && label.length > 200) {
        return NextResponse.json({ error: "label must be ≤ 200 chars" }, { status: 400 });
      }
      update.label = label;
    }

    if (body.email !== undefined) {
      const email = body.email === null ? null : String(body.email).trim().toLowerCase();
      if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320)) {
        return NextResponse.json({ error: "email is invalid" }, { status: 400 });
      }
      update.email = email;
    }

    if (body.max_uses !== undefined) {
      const maxUses = Number(body.max_uses);
      if (!Number.isFinite(maxUses) || maxUses < 1 || maxUses > 1000) {
        return NextResponse.json(
          { error: "max_uses must be between 1 and 1000" },
          { status: 400 }
        );
      }
      update.max_uses = maxUses;
    }

    if (body.expires_at !== undefined) {
      if (body.expires_at === null) {
        update.expires_at = null;
      } else {
        const d = new Date(String(body.expires_at));
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json({ error: "expires_at is invalid" }, { status: 400 });
        }
        update.expires_at = d.toISOString();
      }
    }

    // Revocation toggle: { revoke: true } sets revoked_at = now;
    // { revoke: false } clears it (un-revoke).
    if (body.revoke === true) {
      update.revoked_at = new Date().toISOString();
    } else if (body.revoke === false) {
      update.revoked_at = null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("late_registration_invites")
      .update(update)
      .eq("id", inviteId)
      .eq("hackathon_id", hackathonId)
      .select("*")
      .single();

    if (error) {
      console.error("Failed to update late invite:", error);
      return NextResponse.json({ error: "Failed to update invite" }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE — permanently delete an invite (and its claims) ─
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, inviteId } = await params;
    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(inviteId)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }
    const result = await authenticateAndAuthorize(request, hackathonId);
    if ("error" in result) return result.error;
    const { supabase, role } = result;

    if (!canEdit(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error, count } = await supabase
      .from("late_registration_invites")
      .delete({ count: "exact" })
      .eq("id", inviteId)
      .eq("hackathon_id", hackathonId);

    if (error) {
      console.error("Failed to delete late invite:", error);
      return NextResponse.json({ error: "Failed to delete invite" }, { status: 500 });
    }
    if (!count) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Invite deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
