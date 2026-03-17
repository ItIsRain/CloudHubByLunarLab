import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { UUID_RE } from "@/lib/constants";
import { checkRateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

/** GET — Look up invitation details by token (no side effects) */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token || !UUID_RE.test(token)) {
      return NextResponse.json({ error: "Invalid or missing token" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // Look up invitation by token — must match phase and hackathon
    const { data: reviewer } = await admin
      .from("phase_reviewers")
      .select("id, name, email, status, phase:competition_phases!phase_reviewers_phase_id_fkey(id, name, hackathon_id, hackathon:hackathons!competition_phases_hackathon_id_fkey(id, name))")
      .eq("invitation_token", token)
      .eq("phase_id", phaseId)
      .maybeSingle();

    if (!reviewer) {
      return NextResponse.json({ error: "Invitation not found or already used" }, { status: 404 });
    }

    // Verify phase belongs to the right hackathon
    const phase = reviewer.phase as unknown as Record<string, unknown> | null;
    if (phase?.hackathon_id !== hackathonId) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const hackathon = phase?.hackathon as unknown as Record<string, unknown> | null;

    return NextResponse.json({
      data: {
        reviewerName: reviewer.name,
        reviewerEmail: reviewer.email,
        status: reviewer.status,
        phaseName: phase?.name,
        hackathonName: hackathon?.name,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST — Accept or decline a phase reviewer invitation */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId) || !UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "You must be logged in to accept an invitation" }, { status: 401 });
    }

    // Rate limit: 10 accept/decline attempts per user per 5 minutes
    const rl = checkRateLimit(user.id, { namespace: "reviewer-accept", limit: 10, windowMs: 5 * 60 * 1000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const token = body.token as string;
    const action = body.action as string; // "accept" or "decline"

    if (!token || !UUID_RE.test(token)) {
      return NextResponse.json({ error: "Invalid or missing token" }, { status: 400 });
    }

    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 });
    }

    // Use admin client to bypass RLS — the reviewer's row was created by the organizer
    const admin = getSupabaseAdminClient();

    // Look up invitation
    const { data: reviewer } = await admin
      .from("phase_reviewers")
      .select("id, email, status, phase_id, user_id, phase:competition_phases!phase_reviewers_phase_id_fkey(hackathon_id)")
      .eq("invitation_token", token)
      .eq("phase_id", phaseId)
      .maybeSingle();

    if (!reviewer) {
      return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });
    }

    // Verify phase belongs to the right hackathon
    const phase = reviewer.phase as unknown as Record<string, unknown> | null;
    if (phase?.hackathon_id !== hackathonId) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (reviewer.status !== "invited") {
      return NextResponse.json(
        { error: `This invitation has already been ${reviewer.status}` },
        { status: 409 }
      );
    }

    // Verify the logged-in user's email matches the invitation email
    const userEmail = user.email?.toLowerCase().trim();
    const invitedEmail = (reviewer.email as string).toLowerCase().trim();
    if (userEmail !== invitedEmail) {
      return NextResponse.json(
        { error: "Your account email does not match this invitation. Please log in with the correct account." },
        { status: 403 }
      );
    }

    if (action === "accept") {
      // Update reviewer: set status to accepted, link to the real user_id, clear token
      const { error: updateError } = await admin
        .from("phase_reviewers")
        .update({
          status: "accepted",
          user_id: user.id,
          accepted_at: new Date().toISOString(),
          invitation_token: null, // Invalidate token after use
        })
        .eq("id", reviewer.id);

      if (updateError) {
        return NextResponse.json({ error: "Failed to accept invitation" }, { status: 500 });
      }

      return NextResponse.json({
        data: { accepted: true, phaseId, hackathonId },
      });
    } else {
      // Decline
      const { error: updateError } = await admin
        .from("phase_reviewers")
        .update({
          status: "declined",
          invitation_token: null,
        })
        .eq("id", reviewer.id);

      if (updateError) {
        return NextResponse.json({ error: "Failed to decline invitation" }, { status: 500 });
      }

      return NextResponse.json({
        data: { declined: true, phaseId, hackathonId },
      });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
