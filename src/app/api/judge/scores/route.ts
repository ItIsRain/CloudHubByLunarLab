import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authenticateRequest, assertScope } from "@/lib/api-auth";

/**
 * GET /api/judge/scores
 *
 * Returns the authenticated judge's complete score history across all
 * hackathons and phases. Data is grouped by hackathon > phase on the client.
 *
 * Response shape:
 * {
 *   data: {
 *     phases: ReviewerPhaseWithScores[],  // all phases with inline scores
 *     stats: { hackathonCount, scoreCount, averageScore }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/judge");
      if (scopeError)
        return NextResponse.json({ error: scopeError }, { status: 403 });
    }

    // Use admin client — auth is already verified above; RLS on competition_phases
    // can block FK joins for reviewers with non-"accepted" status.
    const supabase = getSupabaseAdminClient();

    // 1. Fetch all phases where the user is a reviewer (any status)
    const { data: reviewerRows, error: reviewerError } = await supabase
      .from("phase_reviewers")
      .select(
        `
        id,
        phase_id,
        user_id,
        status,
        invited_at,
        accepted_at,
        phase:competition_phases!phase_reviewers_phase_id_fkey(
          id,
          name,
          phase_type,
          status,
          scoring_criteria,
          blind_review,
          hackathon_id,
          campus_filter,
          hackathon:hackathons!competition_phases_hackathon_id_fkey(
            id,
            name,
            tagline,
            status,
            cover_image
          )
        )
      `
      )
      .eq("user_id", auth.userId)
      .in("status", ["accepted", "invited"]);

    if (reviewerError) {
      console.error("Failed to fetch reviewer phases:", reviewerError);
      return NextResponse.json(
        { error: "Failed to fetch reviewer phases" },
        { status: 500 }
      );
    }

    // Collect all phase IDs the reviewer belongs to
    const phaseIds = (reviewerRows || [])
      .filter((r) => r.phase != null)
      .map((r) => {
        const phase = r.phase as unknown as Record<string, unknown>;
        return phase.id as string;
      });

    // 2. Fetch all scores submitted by this reviewer across those phases
    let scores: Array<Record<string, unknown>> = [];
    if (phaseIds.length > 0) {
      const { data: scoreRows, error: scoreError } = await supabase
        .from("phase_scores")
        .select(
          `
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
          registration:hackathon_registrations!phase_scores_registration_id_fkey(
            id,
            user_id,
            applicant:profiles!hackathon_registrations_user_id_fkey(id, name, email)
          )
        `
        )
        .eq("reviewer_id", auth.userId)
        .in("phase_id", phaseIds)
        .order("submitted_at", { ascending: false });

      if (scoreError) {
        console.error("Failed to fetch scores:", scoreError);
        return NextResponse.json(
          { error: "Failed to fetch scores" },
          { status: 500 }
        );
      }
      scores = (scoreRows as Array<Record<string, unknown>>) || [];
    }

    // 3. Fetch assignment counts per phase for this reviewer
    let assignmentCounts: Record<string, number> = {};
    if (phaseIds.length > 0) {
      const { data: assignments, error: assignError } = await supabase
        .from("reviewer_assignments")
        .select("phase_id")
        .eq("reviewer_id", auth.userId)
        .in("phase_id", phaseIds);

      if (!assignError && assignments) {
        for (const a of assignments) {
          const pid = a.phase_id as string;
          assignmentCounts[pid] = (assignmentCounts[pid] || 0) + 1;
        }
      }
    }

    // 4. Build score lookup by phase_id
    const scoresByPhase = new Map<string, Array<Record<string, unknown>>>();
    for (const s of scores) {
      const pid = s.phase_id as string;
      if (!scoresByPhase.has(pid)) {
        scoresByPhase.set(pid, []);
      }
      scoresByPhase.get(pid)!.push(s);
    }

    // 5. Build response: phases with inline scores, grouped later on client
    const phases = (reviewerRows || [])
      .filter((r) => r.phase != null)
      .map((r) => {
        const phase = r.phase as unknown as Record<string, unknown>;
        const hackathon = phase.hackathon as unknown as Record<
          string,
          unknown
        > | null;
        const pid = phase.id as string;
        const phaseScores = scoresByPhase.get(pid) || [];
        const isBlindReview = phase.blind_review === true;

        // Strip applicant info if blind review is on
        const sanitizedScores = isBlindReview
          ? phaseScores.map((s) => ({
              ...s,
              registration: s.registration
                ? {
                    id: (s.registration as Record<string, unknown>).id,
                    applicant: null,
                  }
                : null,
            }))
          : phaseScores;

        return {
          reviewerId: r.id,
          reviewerStatus: r.status,
          invitedAt: r.invited_at,
          acceptedAt: r.accepted_at,
          phaseId: pid,
          phaseName: phase.name,
          phaseType: phase.phase_type,
          phaseStatus: phase.status,
          campusFilter: phase.campus_filter,
          blindReview: isBlindReview,
          scoringCriteria: phase.scoring_criteria,
          hackathonId: hackathon?.id,
          hackathonName: hackathon?.name,
          hackathonTagline: hackathon?.tagline,
          hackathonStatus: hackathon?.status,
          hackathonBanner: hackathon?.cover_image,
          totalAssigned: assignmentCounts[pid] || 0,
          totalScored: phaseScores.length,
          averageScore:
            phaseScores.length > 0
              ? Math.round(
                  (phaseScores.reduce(
                    (sum, s) => sum + Number(s.total_score || 0),
                    0
                  ) /
                    phaseScores.length) *
                    100
                ) / 100
              : null,
          scores: sanitizedScores,
        };
      });

    // 6. Compute aggregate stats
    const hackathonIds = new Set(
      phases.map((p) => p.hackathonId).filter(Boolean)
    );
    const totalScores = scores.length;
    const avgScore =
      totalScores > 0
        ? Math.round(
            (scores.reduce(
              (sum, s) => sum + Number(s.total_score || 0),
              0
            ) /
              totalScores) *
              100
          ) / 100
        : 0;

    return NextResponse.json({
      data: {
        phases,
        stats: {
          hackathonCount: hackathonIds.size,
          scoreCount: totalScores,
          averageScore: avgScore,
        },
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
