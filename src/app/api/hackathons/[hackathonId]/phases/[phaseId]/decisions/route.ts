import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { UUID_RE } from "@/lib/constants";

type RouteParams = { params: Promise<{ hackathonId: string; phaseId: string }> };

interface ScoreRow {
  registration_id: string;
  reviewer_id: string;
  recommendation: string | null;
  total_score: number;
}

/** GET - List all decisions for a phase (organizer only) */
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

    const { data: decisions, error } = await supabase
      .from("phase_decisions")
      .select(`
        id,
        phase_id,
        registration_id,
        decision,
        recommendation_count,
        total_reviewers,
        average_score,
        decided_by,
        rationale,
        is_override,
        created_at,
        updated_at,
        registration:hackathon_registrations!phase_decisions_registration_id_fkey(
          id,
          user_id,
          applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email)
        ),
        decided_by_user:profiles!phase_decisions_decided_by_fkey(id, name, email)
      `)
      .eq("phase_id", phaseId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch decisions" }, { status: 400 });
    }

    return NextResponse.json({ data: decisions || [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** POST - Run majority-rule decision engine OR manual override for a single registration */
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

    let body: { registrationId?: string; decision?: string; rationale?: string } = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is valid for bulk run
    }

    const { registrationId, decision, rationale } = body;

    // ── Manual override for a single registration ──
    if (registrationId) {
      if (typeof registrationId !== "string" || !UUID_RE.test(registrationId)) {
        return NextResponse.json(
          { error: "registrationId must be a valid UUID" },
          { status: 400 }
        );
      }

      if (
        rationale !== undefined &&
        typeof rationale === "string" &&
        rationale.length > 2000
      ) {
        return NextResponse.json(
          { error: "rationale must be under 2000 characters" },
          { status: 400 }
        );
      }

      if (!decision) {
        return NextResponse.json(
          { error: "decision is required for manual override" },
          { status: 400 }
        );
      }

      const validDecisions = ["advance", "borderline", "do_not_advance"];
      if (!validDecisions.includes(decision)) {
        return NextResponse.json(
          { error: `decision must be one of: ${validDecisions.join(", ")}` },
          { status: 400 }
        );
      }

      // Get existing score data for this registration to preserve counts
      const { data: scores } = await supabase
        .from("phase_scores")
        .select("reviewer_id, recommendation, total_score")
        .eq("phase_id", phaseId)
        .eq("registration_id", registrationId);

      const scoreRows = (scores || []) as ScoreRow[];
      const recommendCount = scoreRows.filter(
        (s) => s.recommendation === "recommend" || s.recommendation === "advance"
      ).length;
      const totalReviewers = scoreRows.length;
      const avgScore =
        totalReviewers > 0
          ? Math.round(
              (scoreRows.reduce((sum, s) => sum + (s.total_score || 0), 0) /
                totalReviewers) *
                100
            ) / 100
          : 0;

      const now = new Date().toISOString();

      const { data: upserted, error } = await supabase
        .from("phase_decisions")
        .upsert(
          {
            phase_id: phaseId,
            registration_id: registrationId,
            decision,
            recommendation_count: recommendCount,
            total_reviewers: totalReviewers,
            average_score: avgScore,
            decided_by: auth.userId,
            rationale: rationale || null,
            is_override: true,
            updated_at: now,
          },
          { onConflict: "phase_id,registration_id" }
        )
        .select("*")
        .single();

      if (error) {
        return NextResponse.json({ error: "Failed to save decision" }, { status: 400 });
      }

      return NextResponse.json({ data: upserted });
    }

    // ── Bulk majority-rule decision engine ──
    // 1. Get all scores for this phase
    const { data: allScores, error: scoresError } = await supabase
      .from("phase_scores")
      .select("registration_id, reviewer_id, recommendation, total_score")
      .eq("phase_id", phaseId);

    if (scoresError) {
      return NextResponse.json({ error: "Failed to fetch scores" }, { status: 400 });
    }

    if (!allScores || allScores.length === 0) {
      return NextResponse.json(
        { error: "No scores found for this phase. Reviewers must submit scores first." },
        { status: 400 }
      );
    }

    // 2. Group scores by registration
    const scoresByRegistration = new Map<string, ScoreRow[]>();
    for (const score of allScores as ScoreRow[]) {
      const regId = score.registration_id;
      const existing = scoresByRegistration.get(regId) || [];
      scoresByRegistration.set(regId, [...existing, score]);
    }

    // 3. Apply majority rule for each registration
    const now = new Date().toISOString();
    const decisionsToUpsert: {
      phase_id: string;
      registration_id: string;
      decision: string;
      recommendation_count: number;
      total_reviewers: number;
      average_score: number;
      decided_by: string;
      rationale: string | null;
      is_override: boolean;
      updated_at: string;
    }[] = [];

    let advancedCount = 0;
    let borderlineCount = 0;
    let doNotAdvanceCount = 0;

    for (const [regId, scores] of scoresByRegistration) {
      const totalReviewers = scores.length;
      const recommendCount = scores.filter(
        (s) => s.recommendation === "recommend" || s.recommendation === "advance"
      ).length;

      const avgScore =
        totalReviewers > 0
          ? Math.round(
              (scores.reduce((sum, s) => sum + (s.total_score || 0), 0) /
                totalReviewers) *
                100
            ) / 100
          : 0;

      // Majority rule logic
      let computedDecision: string;
      let decisionRationale: string;

      if (recommendCount === totalReviewers) {
        // All recommend -> advance
        computedDecision = "advance";
        decisionRationale = `All ${totalReviewers} reviewer(s) recommended advancement`;
        advancedCount++;
      } else if (recommendCount > totalReviewers / 2) {
        // Majority recommend -> advance
        computedDecision = "advance";
        decisionRationale = `Majority (${recommendCount}/${totalReviewers}) recommended advancement`;
        advancedCount++;
      } else if (recommendCount === 1 && totalReviewers > 1) {
        // 1 out of N recommend -> borderline
        computedDecision = "borderline";
        decisionRationale = `Only ${recommendCount}/${totalReviewers} recommended advancement`;
        borderlineCount++;
      } else if (recommendCount === 0) {
        // 0 recommend -> do_not_advance
        computedDecision = "do_not_advance";
        decisionRationale = `No reviewers (0/${totalReviewers}) recommended advancement`;
        doNotAdvanceCount++;
      } else {
        // Exactly half (even split) -> borderline
        computedDecision = "borderline";
        decisionRationale = `Split decision (${recommendCount}/${totalReviewers}) recommended advancement`;
        borderlineCount++;
      }

      decisionsToUpsert.push({
        phase_id: phaseId,
        registration_id: regId,
        decision: computedDecision,
        recommendation_count: recommendCount,
        total_reviewers: totalReviewers,
        average_score: avgScore,
        decided_by: auth.userId,
        rationale: decisionRationale,
        is_override: false,
        updated_at: now,
      });
    }

    // 4. Bulk upsert decisions
    if (decisionsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from("phase_decisions")
        .upsert(decisionsToUpsert, { onConflict: "phase_id,registration_id" });

      if (upsertError) {
        return NextResponse.json({ error: "Failed to save decisions" }, { status: 400 });
      }
    }

    return NextResponse.json({
      data: {
        total: decisionsToUpsert.length,
        advanced: advancedCount,
        borderline: borderlineCount,
        doNotAdvance: doNotAdvanceCount,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH - Update a single decision (override) */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { registrationId, decision, rationale } = body as {
      registrationId: string;
      decision: string;
      rationale?: string;
    };

    if (!registrationId || !decision) {
      return NextResponse.json(
        { error: "registrationId and decision are required" },
        { status: 400 }
      );
    }

    if (typeof registrationId !== "string" || !UUID_RE.test(registrationId)) {
      return NextResponse.json(
        { error: "registrationId must be a valid UUID" },
        { status: 400 }
      );
    }

    if (
      rationale !== undefined &&
      typeof rationale === "string" &&
      rationale.length > 2000
    ) {
      return NextResponse.json(
        { error: "rationale must be under 2000 characters" },
        { status: 400 }
      );
    }

    const validDecisions = ["advance", "borderline", "do_not_advance"];
    if (!validDecisions.includes(decision)) {
      return NextResponse.json(
        { error: `decision must be one of: ${validDecisions.join(", ")}` },
        { status: 400 }
      );
    }

    // Check that a decision record exists for this registration
    const { data: existing } = await supabase
      .from("phase_decisions")
      .select("id")
      .eq("phase_id", phaseId)
      .eq("registration_id", registrationId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "No decision found for this registration. Run the decision engine first." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("phase_decisions")
      .update({
        decision,
        rationale: rationale || null,
        is_override: true,
        decided_by: auth.userId,
        updated_at: now,
      })
      .eq("phase_id", phaseId)
      .eq("registration_id", registrationId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to update decision" }, { status: 400 });
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
