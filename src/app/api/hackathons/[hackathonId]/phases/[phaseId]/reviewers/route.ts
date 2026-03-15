import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

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
      .select("id, phase_id, user_id, name, email, status, invited_at, accepted_at, user:profiles!phase_reviewers_user_id_fkey(id, name, email, avatar_url)")
      .eq("phase_id", phaseId)
      .order("invited_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch reviewers" }, { status: 400 });
    }

    return NextResponse.json({ data: reviewers || [] });
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
    const { userId, name, email } = body as {
      userId: string;
      name: string;
      email: string;
    };

    if (!userId || !name || !email) {
      return NextResponse.json(
        { error: "userId, name, and email are required" },
        { status: 400 }
      );
    }

    if (typeof userId !== "string" || !UUID_RE.test(userId)) {
      return NextResponse.json(
        { error: "userId must be a valid UUID" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (typeof name !== "string" || name.length > 200) {
      return NextResponse.json(
        { error: "Name must be a string under 200 characters" },
        { status: 400 }
      );
    }

    // Check for duplicates (unique phase_id + user_id)
    const { data: existing } = await supabase
      .from("phase_reviewers")
      .select("id")
      .eq("phase_id", phaseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This user is already a reviewer for this phase" },
        { status: 409 }
      );
    }

    const { data: reviewer, error } = await supabase
      .from("phase_reviewers")
      .insert({
        phase_id: phaseId,
        user_id: userId,
        name,
        email: email.toLowerCase().trim(),
        status: "invited",
        invited_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to add reviewer" }, { status: 400 });
    }

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
