import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendMentorInvitationEmail } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST — organizer invites a mentor by email (or resends an invite).
 * Mirrors the judge invitation flow: upsert a roster row with a fresh token,
 * email the accept link, and notify the invitee in-app if they already have
 * an account. Re-inviting an already-accepted mentor is a no-op.
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

    const admin = getSupabaseAdminClient();

    // Only the organizer can invite mentors.
    const { data: hackathon } = await admin
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Competition not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = checkRateLimit(auth.userId, {
      namespace: "mentor-invite",
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many invitations sent. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").toLowerCase().trim();
    const name = (String(body.name || "").trim() || email.split("@")[0]).slice(0, 200);
    const expertise = Array.isArray(body.expertise)
      ? body.expertise.map((e: unknown) => String(e).trim()).filter(Boolean).slice(0, 20)
      : [];
    const bio = body.bio ? String(body.bio).slice(0, 2000) : null;

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Don't downgrade an already-accepted mentor.
    const { data: existing } = await admin
      .from("hackathon_mentors")
      .select("id, status")
      .eq("hackathon_id", hackathonId)
      .eq("email", email)
      .maybeSingle();

    if (existing?.status === "accepted") {
      return NextResponse.json({
        success: true,
        message: "This mentor has already accepted the invitation.",
        alreadyAccepted: true,
      });
    }

    const token = crypto.randomUUID();
    const { data: invitation, error: upsertError } = await admin
      .from("hackathon_mentors")
      .upsert(
        {
          hackathon_id: hackathonId,
          email,
          name,
          expertise,
          bio,
          status: "invited",
          invitation_token: token,
          user_id: null,
          accepted_at: null,
        },
        { onConflict: "hackathon_id,email" }
      )
      .select("invitation_token")
      .single();

    if (upsertError || !invitation) {
      return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
    }

    const acceptUrl = `${SITE_URL}/hackathons/${hackathonId}/mentors/accept?token=${invitation.invitation_token}`;

    await sendMentorInvitationEmail({
      to: email,
      mentorName: name,
      hackathonName: hackathon.name as string,
      acceptUrl,
    }).catch((e) => console.error("[mentor-invite] email failed:", e));

    // In-app notification if the invitee already has an account.
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profile?.id) {
      admin
        .from("notifications")
        .insert({
          user_id: profile.id,
          type: "hackathon-update",
          title: `You're invited to mentor ${hackathon.name as string}`,
          message: `You've been invited to be a mentor for ${hackathon.name as string}. Check your email or open the invitation to accept.`,
          link: `/hackathons/${hackathonId}/mentors/accept?token=${invitation.invitation_token}`,
        })
        .then(() => {}, () => {});
    }

    return NextResponse.json({ success: true, message: `Invitation sent to ${email}` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
