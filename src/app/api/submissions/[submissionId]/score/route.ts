import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyIsJudge, getHackathonTimeline } from "@/lib/supabase/auth-helpers";
import { canJudge, getPhaseMessage } from "@/lib/hackathon-phases";

async function getHackathonIdForSubmission(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  submissionId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("submissions")
    .select("hackathon_id")
    .eq("id", submissionId)
    .single();
  return data?.hackathon_id ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the hackathon for this submission
    const hackathonId = await getHackathonIdForSubmission(supabase, submissionId);
    if (!hackathonId) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify judge status and judging window in parallel
    const [isJudge, timeline] = await Promise.all([
      verifyIsJudge(supabase, hackathonId, user.id),
      getHackathonTimeline(supabase, hackathonId),
    ]);

    if (!isJudge) {
      return NextResponse.json(
        { error: "Only judges can score submissions" },
        { status: 403 }
      );
    }

    if (timeline && !canJudge(timeline)) {
      return NextResponse.json(
        { error: getPhaseMessage(timeline, "judge") },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate score range
    const totalScore = Number(body.totalScore);
    if (!Number.isFinite(totalScore) || totalScore < 0 || totalScore > 100) {
      return NextResponse.json(
        { error: "totalScore must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    // Validate criteria is an array
    if (body.criteria !== undefined && !Array.isArray(body.criteria)) {
      return NextResponse.json(
        { error: "criteria must be an array" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("scores")
      .insert({
        submission_id: submissionId,
        judge_id: user.id,
        criteria: body.criteria || [],
        total_score: totalScore,
        overall_feedback: body.overallFeedback || null,
        flagged: body.flagged === true,
        scored_at: new Date().toISOString(),
      })
      .select("*, judge:profiles!scores_judge_id_fkey(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Recalculate average score
    await recalculateAverageScore(supabase, submissionId);

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get the hackathon for this submission
    const hackathonId = await getHackathonIdForSubmission(supabase, submissionId);
    if (!hackathonId) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify judge status and judging window in parallel
    const [isJudge, timeline] = await Promise.all([
      verifyIsJudge(supabase, hackathonId, user.id),
      getHackathonTimeline(supabase, hackathonId),
    ]);

    if (!isJudge) {
      return NextResponse.json(
        { error: "Only judges can score submissions" },
        { status: 403 }
      );
    }

    if (timeline && !canJudge(timeline)) {
      return NextResponse.json(
        { error: getPhaseMessage(timeline, "judge") },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate score range if provided
    if (body.totalScore !== undefined) {
      const score = Number(body.totalScore);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return NextResponse.json(
          { error: "totalScore must be a number between 0 and 100" },
          { status: 400 }
        );
      }
    }
    if (body.criteria !== undefined && !Array.isArray(body.criteria)) {
      return NextResponse.json(
        { error: "criteria must be an array" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (body.criteria !== undefined) updates.criteria = body.criteria;
    if (body.totalScore !== undefined) updates.total_score = Number(body.totalScore);
    if (body.overallFeedback !== undefined) updates.overall_feedback = body.overallFeedback;
    if (body.flagged !== undefined) updates.flagged = body.flagged === true;
    updates.scored_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("scores")
      .update(updates)
      .eq("submission_id", submissionId)
      .eq("judge_id", user.id)
      .select("*, judge:profiles!scores_judge_id_fkey(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Recalculate average score
    await recalculateAverageScore(supabase, submissionId);

    return NextResponse.json({ data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function recalculateAverageScore(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  submissionId: string
) {
  const { data: scores } = await supabase
    .from("scores")
    .select("total_score")
    .eq("submission_id", submissionId);

  if (scores && scores.length > 0) {
    const avg =
      scores.reduce((sum: number, s: { total_score: number }) => sum + s.total_score, 0) /
      scores.length;

    await supabase
      .from("submissions")
      .update({ average_score: Math.round(avg * 100) / 100 })
      .eq("id", submissionId);
  }
}
