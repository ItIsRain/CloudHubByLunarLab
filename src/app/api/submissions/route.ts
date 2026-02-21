import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToSubmission, submissionFormToDbRow } from "@/lib/supabase/mappers";

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
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50", 10);
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("submissions")
      .select(SUBMISSION_SELECT, { count: "exact" });

    if (hackathonId) query = query.eq("hackathon_id", hackathonId);
    if (teamId) query = query.eq("team_id", teamId);
    if (status) query = query.eq("status", status);

    // If filtering by userId, find their team IDs first
    if (userId) {
      const { data: memberTeamIds } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId);

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
    const dbPayload = submissionFormToDbRow(body);

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

    // Default status to draft
    if (!dbPayload.status) dbPayload.status = "draft";

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
