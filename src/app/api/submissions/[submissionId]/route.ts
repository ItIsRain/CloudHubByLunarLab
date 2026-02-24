import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToSubmission, submissionFormToDbRow } from "@/lib/supabase/mappers";
import { getHackathonTimeline, hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { canSubmit, getPhaseMessage } from "@/lib/hackathon-phases";

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

    const submission = dbRowToSubmission(data as Record<string, unknown>);
    const hackathonId = (data as Record<string, unknown>).hackathon_id as string;

    // Auth + visibility check
    const { data: { user } } = await supabase.auth.getUser();

    if (hackathonId) {
      // Block access to submissions from private hackathons for unauthorized users
      const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", hackathonId, user?.id, user?.email ?? undefined);
      if (!canAccess) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      // Strip scores for non-judge / non-organizer users
      if (!user) {
        submission.scores = [];
      } else {
        const { data: hack } = await supabase
          .from("hackathons")
          .select("organizer_id")
          .eq("id", hackathonId)
          .single();
        const isOrganizer = user.id === hack?.organizer_id;
        const isJudge = submission.scores.some((s) => s.judgeId === user.id);
        if (!isOrganizer && !isJudge) {
          submission.scores = [];
        }
      }
    } else if (!user) {
      submission.scores = [];
    }

    return NextResponse.json({ data: submission });
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

    // Check access: team member or hackathon organizer
    const { data: submission } = await supabase
      .from("submissions")
      .select("team_id, hackathon_id")
      .eq("id", submissionId)
      .single();

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Parallelize membership + organizer checks
    const [membershipRes, hackathonRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("id")
        .eq("team_id", submission.team_id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("hackathons")
        .select("organizer_id")
        .eq("id", submission.hackathon_id)
        .single(),
    ]);

    const isOrganizer = hackathonRes.data?.organizer_id === user.id;

    if (!membershipRes.data && !isOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json();
    const updates = submissionFormToDbRow(rawBody);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate status if being changed
    if (updates.status) {
      const allowedStatuses = ["draft", "submitted"];
      if (!allowedStatuses.includes(updates.status as string)) {
        return NextResponse.json(
          { error: "Invalid submission status" },
          { status: 400 }
        );
      }
    }

    // If status is being set to "submitted", enforce submission deadline
    if (updates.status === "submitted") {
      const timeline = await getHackathonTimeline(supabase, submission.hackathon_id);
      if (timeline && !canSubmit(timeline)) {
        return NextResponse.json(
          { error: getPhaseMessage(timeline, "submit") },
          { status: 403 }
        );
      }
      if (!updates.submitted_at) {
        updates.submitted_at = new Date().toISOString();
      }
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
  } catch (err) {
    console.error(err);
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

    // Parallelize leader + organizer checks
    const [leaderRes, hackathonDelRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("id")
        .eq("team_id", submission.team_id)
        .eq("user_id", user.id)
        .eq("is_leader", true)
        .maybeSingle(),
      supabase
        .from("hackathons")
        .select("organizer_id")
        .eq("id", submission.hackathon_id)
        .single(),
    ]);

    const isOrganizer = hackathonDelRes.data?.organizer_id === user.id;

    if (!leaderRes.data && !isOrganizer) {
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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
