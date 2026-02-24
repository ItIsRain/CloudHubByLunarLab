import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTeam } from "@/lib/supabase/mappers";
import { getHackathonTimeline, hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { canFormTeams, getPhaseMessage } from "@/lib/hackathon-phases";
import { UUID_RE } from "@/lib/constants";

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
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50", 10) || 50));
    const offset = (page - 1) * pageSize;

    // Require at least one filter to prevent listing all teams across all hackathons
    if (!hackathonId && !userId) {
      return NextResponse.json(
        { error: "hackathonId or userId filter is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("teams")
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (hackathonId) {
      const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", hackathonId, user.id, user.email ?? undefined);
      if (!canAccess) {
        return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
      }
      query = query.eq("hackathon_id", hackathonId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (userId) {
      // Only allow querying own teams — prevent IDOR
      const effectiveUserId = userId === user.id ? userId : user.id;

      // Filter teams where this user is a member
      query = supabase
        .from("teams")
        .select(
          "*, team_members(*, user:profiles!team_members_user_id_fkey(*))",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      // Re-apply hackathonId filter (was set before this block)
      if (hackathonId) {
        query = query.eq("hackathon_id", hackathonId);
      }

      // We need to filter by user membership through a join
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
  } catch (err) {
    console.error(err);
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

    if (!UUID_RE.test(hackathon_id)) {
      return NextResponse.json(
        { error: "Invalid hackathon_id format" },
        { status: 400 }
      );
    }

    // Validate max_size is a reasonable positive number
    if (max_size !== undefined && (typeof max_size !== "number" || max_size < 1 || max_size > 20)) {
      return NextResponse.json(
        { error: "max_size must be a number between 1 and 20" },
        { status: 400 }
      );
    }

    // Validate join_password length if provided
    const trimmedPassword = typeof join_password === "string" ? join_password.trim() : join_password;
    if (trimmedPassword && (typeof trimmedPassword !== "string" || trimmedPassword.length < 4 || trimmedPassword.length > 100)) {
      return NextResponse.json(
        { error: "Team password must be between 4 and 100 characters" },
        { status: 400 }
      );
    }

    // Run validation queries in parallel
    const [hackathonRes, registrationRes, membershipRes] = await Promise.all([
      supabase.from("hackathons").select("id").eq("id", hackathon_id).single(),
      supabase.from("hackathon_registrations").select("id").eq("hackathon_id", hackathon_id).eq("user_id", user.id).in("status", ["confirmed", "approved"]).maybeSingle(),
      supabase.from("team_members").select("team_id, teams!inner(hackathon_id)").eq("user_id", user.id).eq("teams.hackathon_id", hackathon_id),
    ]);

    if (!hackathonRes.data) {
      return NextResponse.json(
        { error: "Hackathon not found" },
        { status: 404 }
      );
    }

    if (!registrationRes.data) {
      return NextResponse.json(
        { error: "You must be registered for this hackathon to create a team" },
        { status: 403 }
      );
    }

    if (membershipRes.data && membershipRes.data.length > 0) {
      return NextResponse.json(
        { error: "You are already on a team in this hackathon" },
        { status: 409 }
      );
    }

    // Verify team formation window is open
    const timeline = await getHackathonTimeline(supabase, hackathon_id);
    if (timeline && !canFormTeams(timeline)) {
      return NextResponse.json(
        { error: getPhaseMessage(timeline, "formTeams") },
        { status: 403 }
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
        join_password: trimmedPassword || null,
        status: "forming",
      })
      .select("id")
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

    // Update team_count on the hackathon (fire-and-forget — denormalized counter)
    Promise.resolve(
      supabase
        .from("teams")
        .select("id", { count: "exact", head: true })
        .eq("hackathon_id", hackathon_id)
    ).then(({ count: teamCount }) => {
      if (teamCount !== null) {
        return supabase
          .from("hackathons")
          .update({ team_count: teamCount })
          .eq("id", hackathon_id);
      }
    }).catch((err) => {
      console.warn("Failed to update hackathon team_count:", err);
    });

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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
