import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

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

    const body = await request.json();

    const { data, error } = await supabase
      .from("scores")
      .insert({
        submission_id: submissionId,
        judge_id: user.id,
        criteria: body.criteria || [],
        total_score: body.totalScore || 0,
        overall_feedback: body.overallFeedback || null,
      })
      .select("*, judge:profiles!scores_judge_id_fkey(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Recalculate average score
    await recalculateAverageScore(supabase, submissionId);

    return NextResponse.json({ data });
  } catch {
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

    const body = await request.json();

    const updates: Record<string, unknown> = {};
    if (body.criteria !== undefined) updates.criteria = body.criteria;
    if (body.totalScore !== undefined) updates.total_score = body.totalScore;
    if (body.overallFeedback !== undefined) updates.overall_feedback = body.overallFeedback;
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recalculateAverageScore(supabase: any, submissionId: string) {
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
