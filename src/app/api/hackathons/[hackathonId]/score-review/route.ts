import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

type RouteParams = { params: Promise<{ hackathonId: string }> };

/**
 * GET /api/hackathons/[hackathonId]/score-review
 *
 * Returns aggregated score data across all phases for the Score Review Dashboard.
 * Organizer-only endpoint.
 *
 * Response shape:
 * {
 *   data: {
 *     phases: PhaseWithCriteria[],
 *     registrations: RegistrationSummary[],
 *     scores: ScoreEntry[],
 *     decisions: DecisionEntry[],
 *   }
 * }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { hackathonId } = await params;

    if (!UUID_RE.test(hackathonId)) {
      return NextResponse.json({ error: "Invalid hackathon ID" }, { status: 400 });
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

    // Verify user is the organizer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    if (hackathon.organizer_id !== auth.userId) {
      return NextResponse.json({ error: "Forbidden — organizer only" }, { status: 403 });
    }

    // 1. Fetch all phases for this hackathon
    const { data: phases, error: phasesError } = await supabase
      .from("competition_phases")
      .select("id, name, phase_type, status, scoring_scale_max, require_recommendation, is_weighted, scoring_criteria, sort_order")
      .eq("hackathon_id", hackathonId)
      .order("sort_order", { ascending: true });

    if (phasesError) {
      return NextResponse.json({ error: "Failed to fetch phases" }, { status: 400 });
    }

    if (!phases || phases.length === 0) {
      return NextResponse.json({
        data: { phases: [], registrations: [], scores: [], decisions: [] },
      });
    }

    const phaseIds = phases.map((p) => p.id);

    // 2. Fetch all accepted/approved registrations for this hackathon
    const { data: registrations, error: regError } = await supabase
      .from("hackathon_registrations")
      .select(`
        id,
        user_id,
        status,
        applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email, avatar)
      `)
      .eq("hackathon_id", hackathonId)
      .in("status", ["accepted", "approved", "confirmed", "eligible"]);

    if (regError) {
      return NextResponse.json({ error: "Failed to fetch registrations" }, { status: 400 });
    }

    // 3. Fetch all scores for all phases in one query
    const { data: scores, error: scoresError } = await supabase
      .from("phase_scores")
      .select(`
        id,
        phase_id,
        reviewer_id,
        registration_id,
        criteria_scores,
        total_score,
        recommendation,
        overall_feedback,
        flagged,
        submitted_at
      `)
      .in("phase_id", phaseIds)
      .order("submitted_at", { ascending: false });

    if (scoresError) {
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 400 });
    }

    // 4. Fetch all decisions for all phases
    const { data: decisions, error: decisionsError } = await supabase
      .from("phase_decisions")
      .select("id, phase_id, registration_id, decision, recommendation_count, total_reviewers, average_score, is_override, rationale")
      .in("phase_id", phaseIds);

    if (decisionsError) {
      return NextResponse.json({ error: "Failed to fetch decisions" }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        phases: phases ?? [],
        registrations: registrations ?? [],
        scores: scores ?? [],
        decisions: decisions ?? [],
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
