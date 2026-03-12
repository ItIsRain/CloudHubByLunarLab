import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { profileToPublicUser } from "@/lib/supabase/mappers";
import { PROFILE_PUBLIC_COLS } from "@/lib/constants";
import type { User } from "@/lib/types";

/** GET: Look up invitation details by token (read-only, no side effects) */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    const { data: invitation, error } = await supabase
      .from("judge_invitations")
      .select("id,email,name,status")
      .eq("hackathon_id", hackathonId)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    // Get hackathon name for display (only after validating pending invitation)
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("name")
      .eq("id", hackathonId)
      .single();

    return NextResponse.json({
      data: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        status: invitation.status,
        hackathonName: hackathon?.name || "Unknown Hackathon",
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ hackathonId: string }> }
) {
  try {
    const { hackathonId } = await params;
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify invitation
    const { data: invitation, error: invError } = await supabase
      .from("judge_invitations")
      .select("id,email,name,status")
      .eq("hackathon_id", hackathonId)
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (invError || !invitation) {
      return NextResponse.json(
        { error: "Invalid, expired, or already accepted invitation" },
        { status: 404 }
      );
    }

    // Verify the authenticated user's email matches the invitation email
    const { data: acceptorProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single();

    if (
      !acceptorProfile?.email ||
      acceptorProfile.email.toLowerCase() !== invitation.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Atomically mark invitation as accepted (only if still pending)
    const { data: updatedInv, error: updateError } = await supabase
      .from("judge_invitations")
      .update({ status: "accepted", accepted_by: user.id })
      .eq("id", invitation.id)
      .eq("status", "pending")
      .select("id")
      .single();

    if (updateError || !updatedInv) {
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 409 }
      );
    }

    // Get user profile to build User object for JSONB
    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_PUBLIC_COLS)
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const userObj = profileToPublicUser(profile as Record<string, unknown>);

    // Add judge role to user profile if not already present
    const currentRoles = (profile.roles as string[]) || [];
    if (!currentRoles.includes("judge")) {
      await supabase
        .from("profiles")
        .update({ roles: [...currentRoles, "judge"] })
        .eq("id", user.id);
    }

    // Update hackathon judges JSONB: replace temp entry (matched by email) or append
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("judges")
      .eq("id", hackathonId)
      .single();

    const existingJudges: User[] =
      (hackathon?.judges as User[]) || [];

    // Remove any placeholder entry that matches the invitation email or user id (idempotency)
    const filtered = existingJudges.filter(
      (j) =>
        j.email?.toLowerCase() !== invitation.email.toLowerCase() &&
        j.id !== user.id
    );

    // Add the real profile
    const updatedJudges = [...filtered, userObj];

    await supabase
      .from("hackathons")
      .update({ judges: updatedJudges })
      .eq("id", hackathonId);

    return NextResponse.json({
      success: true,
      message: "Invitation accepted! You are now a judge.",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
