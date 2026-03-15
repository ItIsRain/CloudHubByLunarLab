import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

interface CriteriaScore {
  criteriaId: string;
  score: number;
  feedback?: string;
}

interface PhaseConfig {
  id: string;
  status: string;
  scoring_scale_max: number | null;
  require_recommendation: boolean | null;
  is_weighted: boolean | null;
  scoring_criteria: ScoringCriteria[] | null;
}

interface ScoringCriteria {
  id: string;
  name: string;
  maxScore: number;
  weight: number; // percentage (all weights sum to 100)
}

/** GET - List all scores for a phase */
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

    // Verify user is either the organizer or a reviewer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Verify phase belongs to this hackathon
    const { data: phaseOwnership } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phaseOwnership) {
      return NextResponse.json({ error: "Phase not found in this hackathon" }, { status: 404 });
    }

    const isOrganizer = hackathon.organizer_id === auth.userId;

    // If not organizer, verify they are a reviewer for this phase
    if (!isOrganizer) {
      const { data: reviewerRecord } = await supabase
        .from("phase_reviewers")
        .select("id, status")
        .eq("phase_id", phaseId)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (!reviewerRecord || reviewerRecord.status !== "accepted") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Organizer sees all scores; reviewer sees only their own (blind review)
    let query = supabase
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
        submitted_at,
        updated_at,
        reviewer:profiles!phase_scores_reviewer_id_fkey(id, name, email),
        registration:hackathon_registrations!phase_scores_registration_id_fkey(
          id,
          user_id,
          applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email)
        )
      `)
      .eq("phase_id", phaseId);

    if (!isOrganizer) {
      query = query.eq("reviewer_id", auth.userId);
    }

    const { data: scores, error } = await query.order("submitted_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 400 });
    }

    return NextResponse.json({ data: scores || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST - Submit a score (reviewer or organizer) */
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

    // Verify user is either the organizer or an accepted reviewer
    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", hackathonId)
      .single();

    if (!hackathon) {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }

    // Verify phase belongs to this hackathon
    const { data: phaseOwnership } = await supabase
      .from("competition_phases")
      .select("id")
      .eq("id", phaseId)
      .eq("hackathon_id", hackathonId)
      .maybeSingle();

    if (!phaseOwnership) {
      return NextResponse.json({ error: "Phase not found in this hackathon" }, { status: 404 });
    }

    const isOrganizer = hackathon.organizer_id === auth.userId;

    if (!isOrganizer) {
      const { data: reviewerRecord } = await supabase
        .from("phase_reviewers")
        .select("id, status")
        .eq("phase_id", phaseId)
        .eq("user_id", auth.userId)
        .maybeSingle();

      if (!reviewerRecord || reviewerRecord.status !== "accepted") {
        return NextResponse.json(
          { error: "You must be an accepted reviewer or the organizer to submit scores" },
          { status: 403 }
        );
      }
    }

    // Get phase configuration
    const { data: phase } = await supabase
      .from("competition_phases")
      .select("id, status, scoring_scale_max, require_recommendation, is_weighted, scoring_criteria")
      .eq("id", phaseId)
      .single();

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    const phaseData = phase as unknown as PhaseConfig;

    // Phase must be in scoring or active status
    if (phaseData.status !== "scoring" && phaseData.status !== "active") {
      return NextResponse.json(
        { error: `Cannot submit scores when phase status is '${phaseData.status}'. Phase must be 'scoring' or 'active'.` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      registrationId,
      criteriaScores,
      recommendation,
      overallFeedback,
      flagged,
    } = body as {
      registrationId: string;
      criteriaScores: CriteriaScore[];
      recommendation?: string;
      overallFeedback?: string;
      flagged?: boolean;
    };

    if (!registrationId) {
      return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
    }

    if (typeof registrationId !== "string" || !UUID_RE.test(registrationId)) {
      return NextResponse.json(
        { error: "registrationId must be a valid UUID" },
        { status: 400 }
      );
    }

    if (!Array.isArray(criteriaScores) || criteriaScores.length === 0) {
      return NextResponse.json(
        { error: "criteriaScores must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each criteriaId is a valid UUID
    for (const cs of criteriaScores) {
      if (typeof cs.criteriaId !== "string" || !UUID_RE.test(cs.criteriaId)) {
        return NextResponse.json(
          { error: "Each criteriaId must be a valid UUID" },
          { status: 400 }
        );
      }
    }

    // Validate overallFeedback length
    if (
      overallFeedback !== undefined &&
      typeof overallFeedback === "string" &&
      overallFeedback.length > 5000
    ) {
      return NextResponse.json(
        { error: "overallFeedback must be under 5000 characters" },
        { status: 400 }
      );
    }

    // Verify caller is assigned to this registration (or is organizer)
    if (!isOrganizer) {
      const { data: assignment } = await supabase
        .from("reviewer_assignments")
        .select("id")
        .eq("phase_id", phaseId)
        .eq("reviewer_id", auth.userId)
        .eq("registration_id", registrationId)
        .maybeSingle();

      if (!assignment) {
        return NextResponse.json(
          { error: "You are not assigned to review this registration" },
          { status: 403 }
        );
      }
    }

    // Build a lookup from criteria definitions
    const criteriaMap = new Map<string, ScoringCriteria>();
    for (const c of (phaseData.scoring_criteria || [])) {
      criteriaMap.set(c.id, c);
    }

    // Validate criteria scores against per-criterion maxScore
    for (const cs of criteriaScores) {
      if (!cs.criteriaId || typeof cs.score !== "number") {
        return NextResponse.json(
          { error: "Each criteria score must have a criteriaId and numeric score" },
          { status: 400 }
        );
      }
      const def = criteriaMap.get(cs.criteriaId);
      const max = def?.maxScore ?? 10;
      if (cs.score < 0 || cs.score > max) {
        return NextResponse.json(
          { error: `Score for "${def?.name || cs.criteriaId}" must be between 0 and ${max}` },
          { status: 400 }
        );
      }
    }

    // If recommendation is required, validate it
    if (phaseData.require_recommendation && !recommendation) {
      return NextResponse.json(
        { error: "A recommendation is required for this phase" },
        { status: 400 }
      );
    }

    // Calculate total_score as weighted percentage (0-100)
    const totalScore = calculateTotalScore(
      criteriaScores,
      phaseData.scoring_criteria || []
    );

    const now = new Date().toISOString();

    // Upsert using the unique constraint (phase_id, reviewer_id, registration_id)
    const { data: score, error } = await supabase
      .from("phase_scores")
      .upsert(
        {
          phase_id: phaseId,
          reviewer_id: auth.userId,
          registration_id: registrationId,
          criteria_scores: criteriaScores,
          total_score: totalScore,
          recommendation: recommendation || null,
          overall_feedback: overallFeedback || null,
          flagged: flagged ?? false,
          submitted_at: now,
          updated_at: now,
        },
        { onConflict: "phase_id,reviewer_id,registration_id" }
      )
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to submit score" }, { status: 400 });
    }

    return NextResponse.json({ data: score }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Calculate the total score as a weighted percentage (0–100).
 *
 * Formula: totalScore = Σ (score / maxScore * weight)
 * where weight is a percentage and all weights sum to 100.
 *
 * Example: Problem-Solution Fit: 2/3 * 33.3% = 22.2
 *          Execution Readiness: 3/3 * 33.3% = 33.3
 *          Traction:            1/3 * 33.4% = 11.1
 *          Total = 66.6 out of 100
 */
function calculateTotalScore(
  criteriaScores: CriteriaScore[],
  scoringCriteria: ScoringCriteria[]
): number {
  if (criteriaScores.length === 0) return 0;

  const criteriaMap = new Map<string, ScoringCriteria>();
  for (const c of scoringCriteria) {
    criteriaMap.set(c.id, c);
  }

  let totalScore = 0;
  for (const cs of criteriaScores) {
    const def = criteriaMap.get(cs.criteriaId);
    if (def && def.maxScore > 0) {
      // Normalized score (0-1) * weight (percentage)
      totalScore += (cs.score / def.maxScore) * (def.weight || 0);
    }
  }

  return Math.round(totalScore * 100) / 100;
}
