import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dbRowToTeam } from "@/lib/supabase/mappers";
import { verifyIsTeamLeaderOrOrganizer, hasPrivateEntityAccess } from "@/lib/supabase/auth-helpers";

export async function GET(
  _request: NextRequest,
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

    const { data, error } = await supabase
      .from("teams")
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))"
      )
      .eq("id", teamId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    // Block access to teams from private hackathons for unauthorized users
    const hackathonId = (data as Record<string, unknown>).hackathon_id as string;
    if (hackathonId) {
      const canAccess = await hasPrivateEntityAccess(supabase, "hackathon", hackathonId, user.id, user.email ?? undefined);
      if (!canAccess) {
        return NextResponse.json({ error: "Team not found" }, { status: 404 });
      }
    }

    return NextResponse.json({
      data: dbRowToTeam(data as Record<string, unknown>),
    });
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

    // Verify user is team leader or hackathon organizer
    const authorized = await verifyIsTeamLeaderOrOrganizer(supabase, teamId, user.id);
    if (!authorized) {
      return NextResponse.json(
        { error: "Only the team leader or hackathon organizer can update this team" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.track !== undefined) updates.track = body.track;
    if (body.looking_for_roles !== undefined)
      updates.looking_for_roles = body.looking_for_roles;
    if (body.max_size !== undefined) {
      if (typeof body.max_size !== "number" || body.max_size < 1 || body.max_size > 20) {
        return NextResponse.json(
          { error: "max_size must be a number between 1 and 20" },
          { status: 400 }
        );
      }
      updates.max_size = body.max_size;
    }
    if (body.status !== undefined) {
      const VALID_STATUSES = ["forming", "full", "locked"];
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: "Invalid team status" }, { status: 400 });
      }
      updates.status = body.status;
    }
    if (body.join_password !== undefined) {
      const trimmedPw = typeof body.join_password === "string" ? body.join_password.trim() : body.join_password;
      if (typeof trimmedPw === "string" && trimmedPw.length > 0 && trimmedPw.length < 4) {
        return NextResponse.json({ error: "Team password must be at least 4 characters" }, { status: 400 });
      }
      if (typeof trimmedPw === "string" && trimmedPw.length > 100) {
        return NextResponse.json({ error: "Team password is too long" }, { status: 400 });
      }
      updates.join_password = trimmedPw || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("teams")
      .update(updates)
      .eq("id", teamId)
      .select(
        "*, team_members(*, user:profiles!team_members_user_id_fkey(*))"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      data: dbRowToTeam(data as Record<string, unknown>),
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

    // Verify user is team leader or hackathon organizer
    const authorized = await verifyIsTeamLeaderOrOrganizer(supabase, teamId, user.id);
    if (!authorized) {
      return NextResponse.json(
        { error: "Only the team leader or hackathon organizer can delete this team" },
        { status: 403 }
      );
    }

    // Get the hackathon_id before deleting so we can update team_count
    const { data: team } = await supabase
      .from("teams")
      .select("hackathon_id")
      .eq("id", teamId)
      .single();

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("id", teamId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Update team_count on the hackathon (fire-and-forget — denormalized counter)
    if (team?.hackathon_id) {
      const hId = team.hackathon_id;
      Promise.resolve(
        supabase
          .from("teams")
          .select("id", { count: "exact", head: true })
          .eq("hackathon_id", hId)
      ).then(({ count: teamCount }) => {
        if (teamCount !== null) {
          return supabase
            .from("hackathons")
            .update({ team_count: teamCount })
            .eq("id", hId);
        }
      }).catch((err) => {
        console.warn("Failed to update hackathon team_count:", err);
      });
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
