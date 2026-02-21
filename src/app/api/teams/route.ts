import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTeam } from "@/lib/supabase/mappers";

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = request.nextUrl;
    const hackathonId = url.searchParams.get("hackathonId");
    const userId = url.searchParams.get("userId");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50", 10);
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from("teams")
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (hackathonId) {
      query = query.eq("hackathon_id", hackathonId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (userId) {
      // Filter teams where this user is a member
      query = supabase
        .from("teams")
        .select(
          "*, team_members(*, user:profiles!team_members_user_id_fkey(*))",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      // We need to filter by user membership through a join
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
      query = query.in("id", teamIds);
    }

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const total = count || 0;
    const teams = (data || []).map((row) =>
      dbRowToTeam(row as Record<string, unknown>)
    );

    return NextResponse.json({
      data: teams,
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
    const {
      name,
      description,
      hackathon_id,
      track,
      looking_for_roles,
      max_size,
      join_password,
    } = body;

    if (!name || !hackathon_id) {
      return NextResponse.json(
        { error: "name and hackathon_id are required" },
        { status: 400 }
      );
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        name,
        description: description || null,
        avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
        hackathon_id,
        track: track || null,
        looking_for_roles: looking_for_roles || [],
        max_size: max_size || 4,
        join_password: join_password || null,
        status: "forming",
      })
      .select()
      .single();

    if (teamError) {
      return NextResponse.json({ error: teamError.message }, { status: 400 });
    }

    // Auto-add creator as leader
    const { error: memberError } = await supabase
      .from("team_members")
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: body.role || "Developer",
        is_leader: true,
      });

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    // Update team_count on the hackathon
    const { count: teamCount } = await supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("hackathon_id", hackathon_id);

    if (teamCount !== null) {
      await supabase
        .from("hackathons")
        .update({ team_count: teamCount })
        .eq("id", hackathon_id);
    }

    // Fetch the full team with members
    const { data: fullTeam, error: fetchError } = await supabase
      .from("teams")
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))"
      )
      .eq("id", team.id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToTeam(fullTeam as Record<string, unknown>),
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
