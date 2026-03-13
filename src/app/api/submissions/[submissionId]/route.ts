import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { dbRowToSubmission, submissionFormToDbRow } from "@/lib/supabase/mappers";
import { getHackathonTimeline, hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { canSubmit, getPhaseMessage } from "@/lib/hackathon-phases";
import { authenticateRequest, assertScope } from "@/lib/api-auth";
import { fireWebhooks } from "@/lib/webhook-delivery";

const SUBMISSION_SELECT =
  "*, team:teams(*, team_members(*, user:profiles!team_members_user_id_fkey(*))), scores(*, judge:profiles!scores_judge_id_fkey(*))";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;

    // Dual auth: session cookies OR API key (also allows unauthenticated for public submissions)
    const auth = await authenticateRequest(request);

    const hasBearer = request.headers.get("authorization")?.startsWith("Bearer ");
    if (hasBearer && auth.type === "unauthenticated") {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

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

    const authUserId = auth.type !== "unauthenticated" ? auth.userId : null;

    // For private entity access, get email
    let authUserEmail: string | undefined;
    if (auth.type === "session") {
      const { data: { user } } = await supabase.auth.getUser();
      authUserEmail = user?.email ?? undefined;
    } else if (auth.type === "api_key") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", auth.userId)
        .single();
      authUserEmail = (profile?.email as string) ?? undefined;
    }

    if (hackathonId) {
      // Block access to submissions from private hackathons for unauthorized users
      const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", hackathonId, authUserId ?? undefined, authUserEmail);
      if (!canAccess) {
        return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      }

      // Strip scores for non-judge / non-organizer users
      if (!authUserId) {
        submission.scores = [];
      } else {
        const { data: hack } = await supabase
          .from("hackathons")
          .select("organizer_id")
          .eq("id", hackathonId)
          .single();
        const isOrganizer = authUserId === hack?.organizer_id;
        const isJudge = submission.scores.some((s) => s.judgeId === authUserId);
        if (!isOrganizer && !isJudge) {
          submission.scores = [];
        }
      }
    } else if (!authUserId) {
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

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

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
        .eq("user_id", auth.userId)
        .maybeSingle(),
      supabase
        .from("hackathons")
        .select("organizer_id")
        .eq("id", submission.hackathon_id)
        .single(),
    ]);

    const isOrganizer = hackathonRes.data?.organizer_id === auth.userId;

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
      return NextResponse.json({ error: "Failed to update submission" }, { status: 400 });
    }

    // Fire webhook for the hackathon organizer
    if (hackathonRes.data) {
      const organizerId = hackathonRes.data.organizer_id as string;
      const eventType = updates.status === "submitted" ? "submission.submitted" : "submission.updated";
      fireWebhooks(organizerId, eventType, {
        submissionId,
        hackathonId: submission.hackathon_id,
        teamId: submission.team_id,
        status: (data as Record<string, unknown>).status,
      });
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
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const { submissionId } = await params;

    // Dual auth: session cookies OR API key
    const auth = await authenticateRequest(request);

    if (auth.type === "unauthenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.type === "api_key") {
      const scopeError = assertScope(auth, "/api/hackathons");
      if (scopeError) {
        return NextResponse.json({ error: scopeError }, { status: 403 });
      }
    }

    const supabase =
      auth.type === "api_key"
        ? getSupabaseAdminClient()
        : await getSupabaseServerClient();

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
        .eq("user_id", auth.userId)
        .eq("is_leader", true)
        .maybeSingle(),
      supabase
        .from("hackathons")
        .select("organizer_id")
        .eq("id", submission.hackathon_id)
        .single(),
    ]);

    const isOrganizer = hackathonDelRes.data?.organizer_id === auth.userId;

    if (!leaderRes.data && !isOrganizer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete submission" }, { status: 400 });
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
