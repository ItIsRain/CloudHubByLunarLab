import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

/**
 * GET — preview a mentor invitation by token (read-only, no email exposed).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: invitation } = await admin
      .from("hackathon_mentors")
      .select("id, name, status")
      .eq("hackathon_id", hackathonId)
      .eq("invitation_token", token)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    const { data: hackathon } = await admin
      .from("hackathons")
      .select("name")
      .eq("id", hackathonId)
      .single();

    return NextResponse.json({
      data: {
        id: invitation.id,
        name: invitation.name,
        status: invitation.status,
        hackathonName: hackathon?.name || "Unknown Competition",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST — accept (or decline) a mentor invitation. Verifies the logged-in user's
 * email matches the invitation, links their account, and adds the 'mentor' role.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid competition ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const token = body.token as string | undefined;
    const action = body.action === "decline" ? "decline" : "accept";
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const { data: invitation } = await admin
      .from("hackathon_mentors")
      .select("id, email, status")
      .eq("hackathon_id", hackathonId)
      .eq("invitation_token", token)
      .maybeSingle();

    if (!invitation) {
      return NextResponse.json({ error: "Invalid or expired invitation" }, { status: 404 });
    }

    if (invitation.status === "accepted") {
      return NextResponse.json({ success: true, message: "You're already a mentor for this competition." });
    }

    // Verify the authenticated user's email matches the invitation email.
    const { data: acceptorProfile } = await admin
      .from("profiles")
      .select("email, roles")
      .eq("id", auth.userId)
      .single();

    if (
      !acceptorProfile?.email ||
      acceptorProfile.email.toLowerCase() !== String(invitation.email).toLowerCase()
    ) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address." },
        { status: 403 }
      );
    }

    if (action === "decline") {
      await admin
        .from("hackathon_mentors")
        .update({ status: "declined" })
        .eq("id", invitation.id)
        .eq("status", "invited");
      return NextResponse.json({ success: true, message: "Invitation declined." });
    }

    // Atomically accept (only if still invited) and link the real account.
    const { data: updated, error: updateError } = await admin
      .from("hackathon_mentors")
      .update({
        status: "accepted",
        user_id: auth.userId,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id)
      .eq("status", "invited")
      .select("id")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: "Invitation could not be accepted." }, { status: 409 });
    }

    // Add the 'mentor' role to the profile if missing.
    const roles = (acceptorProfile.roles as string[]) || [];
    if (!roles.includes("mentor")) {
      await admin
        .from("profiles")
        .update({ roles: [...roles, "mentor"] })
        .eq("id", auth.userId);
    }

    return NextResponse.json({
      success: true,
      message: "Invitation accepted! You are now a mentor.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
