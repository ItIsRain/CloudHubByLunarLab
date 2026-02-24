import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTeam } from "@/lib/supabase/mappers";
import { getHackathonTimeline } from "@/lib/supabase/auth-helpers";
import { canFormTeams, getPhaseMessage } from "@/lib/hackathon-phases";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    // Only allow users to add themselves — prevent IDOR
    const userId = user.id;

    // Validate role against allowed values
    const VALID_ROLES = ["Developer", "Designer", "Product Manager", "Data Scientist", "DevOps", "QA", "Other"];
    const role = VALID_ROLES.includes(body.role) ? body.role : "Developer";

    // Check team capacity and password
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("hackathon_id, max_size, join_password, team_members(id)")
      .eq("id", teamId)
      .single();

    if (teamError) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Verify team formation window is open
    const timeline = await getHackathonTimeline(supabase, team.hackathon_id);
    if (timeline && !canFormTeams(timeline)) {
      return NextResponse.json(
        { error: getPhaseMessage(timeline, "formTeams") },
        { status: 403 }
      );
    }

    // Verify password if team has one
    if (team.join_password) {
      if (!body.password || body.password !== team.join_password) {
        return NextResponse.json({ error: "Incorrect team password" }, { status: 403 });
      }
    }

    const currentMembers = (team.team_members as unknown[])?.length || 0;
    if (currentMembers >= team.max_size) {
      return NextResponse.json({ error: "Team is full" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
        is_leader: false,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "User is already a member of this team" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Return full updated team
    const { data: fullTeam, error: fetchError } = await supabase
      .from("teams")
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))"
      )
      .eq("id", teamId)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const targetUserId = body.user_id || user.id;

    // Fetch caller's membership, team info, and hackathon organizer in one query
    const { data: team } = await supabase
      .from("teams")
      .select("hackathon_id, team_members(user_id, is_leader), hackathon:hackathons!teams_hackathon_id_fkey(organizer_id)")
      .eq("id", teamId)
      .single();

    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const members = (team.team_members as unknown as { user_id: string; is_leader: boolean }[]) || [];
    const callerMember = members.find((m) => m.user_id === user.id);
    const callerIsLeader = callerMember?.is_leader === true;

    // Verify the target is actually a member of this team
    const targetMember = members.find((m) => m.user_id === targetUserId);
    if (!targetMember) {
      return NextResponse.json({ error: "User is not a member of this team" }, { status: 404 });
    }

    // Check if caller is hackathon organizer (from joined data)
    const hackathonData = team.hackathon as unknown as { organizer_id: string } | null;
    const callerIsOrganizer = hackathonData?.organizer_id === user.id;

    if (targetUserId === user.id) {
      // Self-removal: prevent leader from leaving (would leave leaderless team)
      if (callerIsLeader) {
        return NextResponse.json(
          { error: "Team leaders cannot leave. Transfer leadership first or delete the team." },
          { status: 400 }
        );
      }
    } else {
      // Removing someone else: must be leader or organizer
      if (!callerIsLeader && !callerIsOrganizer) {
        return NextResponse.json(
          { error: "Only team leaders or organizers can remove other members" },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
