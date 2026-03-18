import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";
import { sendEmail, emailWrapper, escapeHtml } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

/** GET - List reviewers for a phase (organizer only) */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify phase belongs to this hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found in this hackathon" }, { status: 404 });
    }

    const { data: reviewers, error } = await supabase
      .from("phase_reviewers")
      .select("id, phase_id, user_id, name, email, status, invited_at, accepted_at")
      .eq("phase_id", phaseId)
      .order("invited_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch reviewers:", error);
      return NextResponse.json({ error: "Failed to fetch reviewers" }, { status: 400 });
    }

    // Enrich with profile data for reviewers who have accounts
    const userIds = (reviewers || []).map((r) => r.user_id).filter(Boolean);
    let profileMap: Record<string, { id: string; name: string; email: string; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .in("id", userIds);
      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p as { id: string; name: string; email: string; avatar_url: string | null };
        }
      }
    }

    const enrichedReviewers = (reviewers || []).map((r) => ({
      ...r,
      user: profileMap[r.user_id] || null,
    }));

    return NextResponse.json({ data: enrichedReviewers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST - Add a reviewer to a phase */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Rate limit: 20 reviewer invites per organizer per 15 minutes
    const rl = checkRateLimit(auth.userId, { namespace: "phase-reviewer-invite", limit: 20, windowMs: 15 * 60 * 1000 });
    if (rl.limited) {
      return NextResponse.json(
        { error: "Too many invitations sent. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    // Verify caller is the hackathon organizer and get hackathon details
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id, name")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify phase belongs to this hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id, name")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found in this hackathon" }, { status: 404 });
    }

    const body = await request.json();
    const { userId, name, email } = body as {
      userId: string;
      name: string;
      email: string;
    };

    if (!name || !email) {
      return NextResponse.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Resolve user_id: look up by email in profiles, fallback to provided userId, or generate placeholder
    let resolvedUserId: string;
    if (userId && UUID_RE.test(userId)) {
      resolvedUserId = userId;
    } else {
      // Try to find an existing profile by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
      resolvedUserId = profile?.id || crypto.randomUUID();
    }

    if (typeof name !== "string" || name.length > 200) {
      return NextResponse.json(
        { error: "Name must be a string under 200 characters" },
        { status: 400 }
      );
    }

    // Check for duplicates by email within this phase (more reliable than user_id for external invitees)
    const { data: existingByEmail } = await supabase
      .from("phase_reviewers")
      .select("id")
      .eq("phase_id", phaseId)
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingByEmail) {
      return NextResponse.json(
        { error: "A reviewer with this email is already invited to this phase" },
        { status: 409 }
      );
    }

    const invitationToken = crypto.randomUUID();

    const { data: reviewer, error } = await supabase
      .from("phase_reviewers")
      .insert({
        phase_id: phaseId,
        user_id: resolvedUserId,
        name,
        email: email.toLowerCase().trim(),
        status: "invited",
        invited_at: new Date().toISOString(),
        invitation_token: invitationToken,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Failed to add reviewer:", error);
      return NextResponse.json({ error: "Failed to add reviewer" }, { status: 400 });
    }

    // Send invitation email (fire-and-forget)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const acceptUrl = `${siteUrl}/judge/${hackathonId}/phases/${phaseId}/quick-score?reviewerToken=${invitationToken}`;
    const hackathonName = hackathon.name as string;
    const phaseName = phase.name as string;

    sendEmail({
      to: email.toLowerCase().trim(),
      subject: `You're Invited to Review — ${hackathonName} (${phaseName})`,
      html: emailWrapper(`
        <div style="padding:28px 32px;">
          <p style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;">
            Hi <strong style="color:#ffffff;">${escapeHtml(name)}</strong>,
          </p>
          <p style="color:#e4e4e7;font-size:15px;line-height:1.7;margin:0 0 16px;">
            You've been invited to serve as a reviewer for the
            <strong style="color:#e8440a;">${escapeHtml(phaseName)}</strong> phase of
            <strong style="color:#ffffff;">${escapeHtml(hackathonName)}</strong>.
          </p>
          <div style="padding:14px 18px;background:#1a1a20;border-radius:10px;border:1px solid #27272a;margin:0 0 20px;">
            <p style="margin:0;color:#a1a1aa;font-size:13px;line-height:1.6;">
              As a reviewer, you'll evaluate applicant pitches using a structured scoring criteria.
              Your scores and recommendations will help determine which applicants advance.
            </p>
          </div>
          <div style="text-align:center;padding:8px 0;">
            <a href="${acceptUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#e8440a,#ff5722);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;letter-spacing:0.2px;">
              Accept &amp; Start Reviewing
            </a>
          </div>
          <p style="color:#71717a;font-size:12px;line-height:1.5;margin:20px 0 0;text-align:center;">
            Or copy this link: <a href="${acceptUrl}" style="color:#a1a1aa;text-decoration:underline;word-break:break-all;">${acceptUrl}</a>
          </p>
        </div>
      `),
    }).catch((e) => console.error("Failed to send reviewer invitation email:", e));

    return NextResponse.json({ data: reviewer }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE - Remove a reviewer from a phase */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId, phaseId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
    }
    if (!UUID_RE.test(phaseId)) {
      return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });
    }

    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

    // Verify caller is the hackathon organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify phase belongs to this hackathon
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found in this hackathon" }, { status: 404 });
    }

    const body = await request.json();
    const { reviewerId } = body as { reviewerId: string };

    if (!reviewerId) {
      return NextResponse.json({ error: "reviewerId is required" }, { status: 400 });
    }

    // Verify the reviewer belongs to this phase
    const { data: reviewer } = await supabase
      .from("phase_reviewers")
      .select("id, user_id")
      .eq("id", reviewerId)
      .eq("phase_id", phaseId)
      .single();

    if (!reviewer) {
      return NextResponse.json({ error: "Reviewer not found in this phase" }, { status: 404 });
    }

    // Delete scores, assignments, then the reviewer record (in order to respect FK constraints)
    const [scoresResult, assignmentsResult] = await Promise.all([
      supabase
        .from("phase_scores")
        .delete()
        .eq("phase_id", phaseId)
        .eq("reviewer_id", reviewer.user_id),
      supabase
        .from("reviewer_assignments")
        .delete()
        .eq("phase_id", phaseId)
        .eq("reviewer_id", reviewer.user_id),
    ]);

    if (scoresResult.error) {
      console.error("Failed to delete reviewer scores:", scoresResult.error);
    }
    if (assignmentsResult.error) {
      console.error("Failed to delete reviewer assignments:", assignmentsResult.error);
    }

    const { error } = await supabase
      .from("phase_reviewers")
      .delete()
      .eq("id", reviewerId);

    if (error) {
      return NextResponse.json({ error: "Failed to remove reviewer" }, { status: 400 });
    }

    return NextResponse.json({
      data: { deleted: true, reviewerId },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
