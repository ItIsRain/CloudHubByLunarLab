import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToSubmission, submissionFormToDbRow } from "@/lib/supabase/mappers";
import { getHackathonTimeline } from "@/lib/supabase/auth-helpers";
import { canSubmit, getPhaseMessage } from "@/lib/hackathon-phases";

const SUBMISSION_SELECT =
  "*, team:teams(*, team_members(*, user:profiles!team_members_user_id_fkey(*)))";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const url = request.nextUrl;
    const hackathonId = url.searchParams.get("hackathonId");
    const teamId = url.searchParams.get("teamId");
    const userId = url.searchParams.get("userId");
    const status = url.searchParams.get("status");
    const sortBy = url.searchParams.get("sortBy") || "recent";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10) || 50));
    const offset = (page - 1) * pageSize;

    // Check if user is authenticated (optional — unauthenticated users only see submitted)
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from("submissions")
      .select(SUBMISSION_SELECT, { count: "exact" });

    if (hackathonId) query = query.eq("hackathon_id", hackathonId);
    if (teamId) query = query.eq("team_id", teamId);

    // Unauthenticated users can ONLY see submitted submissions and cannot filter by userId/teamId
    if (!user) {
      query = query.eq("status", "submitted");
      if (userId || teamId) {
        return NextResponse.json(
          { error: "Authentication required to filter by user or team" },
          { status: 401 }
        );
      }
    } else if (status) {
      query = query.eq("status", status);
    }

    // If filtering by userId, only allow own ID — prevent IDOR
    if (userId) {
      const effectiveUserId = user ? userId === user.id ? userId : user.id : null;
      if (!effectiveUserId) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
        });
      }
      const { data: memberTeamIds } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", effectiveUserId);

      const teamIds = (memberTeamIds || []).map((m) => m.team_id);
      if (teamIds.length === 0) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
        });
      }
      query = query.in("team_id", teamIds);
    }

    // Sorting
    if (sortBy === "votes") {
      query = query.order("upvotes", { ascending: false });
    } else if (sortBy === "score") {
      query = query.order("average_score", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const total = count || 0;
    const submissions = (data || []).map((row) =>
      dbRowToSubmission(row as Record<string, unknown>)
    );

    return NextResponse.json({
      data: submissions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + pageSize < total,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();

    // Require hackathonId and teamId
    if (!body.hackathonId && !body.hackathon_id) {
      return NextResponse.json(
        { error: "hackathonId is required" },
        { status: 400 }
      );
    }
    if (!body.teamId && !body.team_id) {
      return NextResponse.json(
        { error: "teamId is required" },
        { status: 400 }
      );
    }

    const dbPayload = submissionFormToDbRow(body);

    // Verify submission window is open
    const hackathonId = dbPayload.hackathon_id as string;
    if (hackathonId) {
      const timeline = await getHackathonTimeline(supabase, hackathonId);
      if (timeline && !canSubmit(timeline)) {
        return NextResponse.json(
          { error: getPhaseMessage(timeline, "submit") },
          { status: 403 }
        );
      }
    }

    // Verify user is a team member
    const { data: membership } = await supabase
      .from("team_members")
      .select("id")
      .eq("team_id", dbPayload.team_id as string)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You must be a team member to create a submission" },
        { status: 403 }
      );
    }

    // Validate and default status
    if (!dbPayload.status) dbPayload.status = "draft";
    if (dbPayload.status !== "draft" && dbPayload.status !== "submitted") {
      return NextResponse.json(
        { error: "Status must be 'draft' or 'submitted'" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("submissions")
      .insert(dbPayload)
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
