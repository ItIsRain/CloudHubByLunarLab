import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTeam } from "@/lib/supabase/mappers";
import { getHackathonTimeline, hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";
import { canFormTeams, getPhaseMessage } from "@/lib/hackathon-phases";
import { checkHackathonAccess } from "@/lib/check-hackathon-access";
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
    const allParam = url.searchParams.get("all");
    const wantAll = allParam === "true" || allParam === "1";
    const wantEmails = url.searchParams.get("includeEmails") === "true";
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

    // Verify the caller can see this hackathon's teams.
    if (hackathonId) {
      const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", hackathonId, user.id, user.email ?? undefined);
      if (!canAccess) {
        return NextResponse.json({ data: [], total: 0, page, pageSize, totalPages: 0, hasMore: false });
      }
    }

    // Member emails are private — only surface them to hackathon staff
    // (organizer/collaborators) that explicitly opt in (e.g. CSV export).
    let includeMemberEmails = false;
    if (wantEmails && hackathonId) {
      const staffAccess = await checkHackathonAccess(supabase, hackathonId, user.id);
      includeMemberEmails = staffAccess.hasAccess;
    }

    // When filtering by user, restrict to teams the user is a member of
    // (only their own — prevents IDOR by ignoring a foreign userId).
    let restrictTeamIds: string[] | null = null;
    if (userId) {
      const effectiveUserId = userId === user.id ? userId : user.id;
      const { data: memberTeamIds } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", effectiveUserId);

      restrictTeamIds = (memberTeamIds || []).map((m) => m.team_id);
      if (restrictTeamIds.length === 0) {
        return NextResponse.json({
          data: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0,
          hasMore: false,
        });
      }
    }

    // Factory so the query can be re-issued per batch when fetching all rows.
    const buildQuery = (from: number, to: number) => {
      let q = supabase
        .from("teams")
        .select(
          "*, team_members(*, user:profiles!team_members_user_id_fkey(*))",
          { count: "exact" }
        )
        .order("created_at", { ascending: false });
      if (hackathonId) q = q.eq("hackathon_id", hackathonId);
      if (status) q = q.eq("status", status);
      if (restrictTeamIds) q = q.in("id", restrictTeamIds);
      return q.range(from, to);
    };

    // Fetch a single page, or every row in batches of 1000 (to get past
    // PostgREST's default max-rows ceiling) when `all=true` is requested.
    let rows: Record<string, unknown>[] = [];
    let total = 0;
    let queryError: { message: string } | null = null;

    if (wantAll) {
      const BATCH_SIZE = 1000;
      let from = 0;
      while (true) {
        const { data, error, count } = await buildQuery(from, from + BATCH_SIZE - 1);
        if (error) {
          queryError = error;
          break;
        }
        if (typeof count === "number") total = count;
        const batch = (data as Record<string, unknown>[]) || [];
        rows.push(...batch);
        if (batch.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }
    } else {
      const { data, error, count } = await buildQuery(offset, offset + pageSize - 1);
      rows = (data as Record<string, unknown>[]) || [];
      total = count || 0;
      queryError = error;
    }

    if (queryError) {
      return NextResponse.json({ error: "Failed to fetch teams" }, { status: 400 });
    }

    const teams = rows.map((row) =>
      dbRowToTeam(row as Record<string, unknown>, { includeMemberEmails })
    );

    return NextResponse.json({
      data: teams,
      total,
      page,
      pageSize,
      totalPages: wantAll ? 1 : Math.ceil(total / pageSize),
      hasMore: wantAll ? false : offset + pageSize < total,
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

    if (typeof name !== "string" || name.trim().length === 0 || name.length > 200) {
      return NextResponse.json(
        { error: "Team name must be between 1 and 200 characters" },
        { status: 400 }
      );
    }

    if (description !== undefined && (typeof description !== "string" || description.length > 2000)) {
      return NextResponse.json(
        { error: "Description must be at most 2000 characters" },
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
      supabase.from("hackathon_registrations").select("id").eq("hackathon_id", hackathon_id).eq("user_id", user.id).in("status", ["confirmed", "approved", "accepted"]).maybeSingle(),
      supabase.from("team_members").select("team_id, teams!inner(hackathon_id)").eq("user_id", user.id).eq("teams.hackathon_id", hackathon_id),
    ]);

    if (!hackathonRes.data) {
      return NextResponse.json(
        { error: "Competition not found" },
        { status: 404 }
      );
    }

    if (!registrationRes.data) {
      return NextResponse.json(
        { error: "You must be registered for this competition to create a team" },
        { status: 403 }
      );
    }

    if (membershipRes.data && membershipRes.data.length > 0) {
      return NextResponse.json(
        { error: "You are already on a team in this competition" },
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
      return NextResponse.json({ error: "Failed to create team" }, { status: 400 });
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
      // The creator couldn't be attached as leader — roll back the orphaned
      // team so it doesn't linger leaderless. The most common cause is the
      // one-team-per-hackathon trigger (creator is already on a team).
      await supabase.from("teams").delete().eq("id", team.id);
      const alreadyOnTeam = memberError.code === "23505";
      return NextResponse.json(
        {
          error: alreadyOnTeam
            ? "You are already on a team for this competition. Leave it before creating a new one."
            : "Failed to create team",
        },
        { status: alreadyOnTeam ? 409 : 400 }
      );
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
      console.warn("Failed to update competition team_count:", err);
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
      return NextResponse.json({ error: "Failed to create team" }, { status: 400 });
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
