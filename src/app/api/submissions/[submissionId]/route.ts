import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToSubmission, submissionFormToDbRow } from "@/lib/supabase/mappers";

const SUBMISSION_SELECT =
  "*, team:teams(*, team_members(*, user:profiles!team_members_user_id_fkey(*))), scores(*, judge:profiles!scores_judge_id_fkey(*))";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT)
      .eq("id", submissionId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: dbRowToSubmission(data as Record<string, unknown>),
    });
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

    // Check access: team member or hackathon organizer
    const { data: submission } = await supabase
      .from("submissions")
      .select("team_id, hackathon_id")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", submission.team_id)
      .eq("user_id", user.id)
      .single();

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", submission.hackathon_id)
      .single();

    const isOrganizer = hackathon?.organizer_id === user.id;

    if (!membership && !isOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();
    const updates = submissionFormToDbRow(rawBody);

    // If status is being set to "submitted", set submitted_at
    if (updates.status === "submitted" && !updates.submitted_at) {
      updates.submitted_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("submissions")
      .update(updates)
      .eq("id", submissionId)
      .select(SUBMISSION_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToSubmission(data as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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

    // Check: team leader or organizer
    const { data: submission } = await supabase
      .from("submissions")
      .select("team_id, hackathon_id")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const { data: leader } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", submission.team_id)
      .eq("user_id", user.id)
      .eq("is_leader", true)
      .single();

    const { data: hackathon } = await supabase
      .from("hackathons")
      .select("organizer_id")
      .eq("id", submission.hackathon_id)
      .single();

    const isOrganizer = hackathon?.organizer_id === user.id;

    if (!leader && !isOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Submission deleted" });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
